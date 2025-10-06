import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ApiUsageRecord {
  id: string;
  user_id: string | null;
  function_name: string;
  api_provider: string;
  api_model: string;
  is_fallback: boolean;
  status: string;
  error_message: string | null;
  response_time_ms: number | null;
  created_at: string;
}

export interface ApiUsageStats {
  totalCalls: number;
  openaiCalls: number;
  geminiCalls: number;
  successRate: number;
  averageResponseTime: number;
  fallbackRate: number;
}

export const useApiUsage = () => {
  const { user } = useAuth();
  const [usage, setUsage] = useState<ApiUsageRecord[]>([]);
  const [stats, setStats] = useState<ApiUsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsage = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('ai_api_usage')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setUsage(data || []);

      // Calculate stats
      if (data && data.length > 0) {
        const totalCalls = data.length;
        const openaiCalls = data.filter(r => r.api_provider === 'openai').length;
        const geminiCalls = data.filter(r => r.api_provider === 'gemini').length;
        const successfulCalls = data.filter(r => r.status === 'success').length;
        const fallbackCalls = data.filter(r => r.is_fallback).length;
        
        const responseTimes = data
          .filter(r => r.response_time_ms !== null)
          .map(r => r.response_time_ms as number);
        
        const averageResponseTime = responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0;

        setStats({
          totalCalls,
          openaiCalls,
          geminiCalls,
          successRate: (successfulCalls / totalCalls) * 100,
          averageResponseTime: Math.round(averageResponseTime),
          fallbackRate: (fallbackCalls / totalCalls) * 100
        });
      }
    } catch (error) {
      console.error('Error fetching API usage:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [user]);

  return { usage, stats, loading, refetch: fetchUsage };
};
