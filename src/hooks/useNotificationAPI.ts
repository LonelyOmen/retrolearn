import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NotificationAPIMessage {
  message: string;
  userId: string;
  roomId: string;
  timestamp: string;
}

export function useNotificationAPI(roomId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<NotificationAPIMessage[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  // Initialize NotificationAPI connection
  const initializeNotificationAPI = useCallback(async () => {
    if (!user || !roomId) return;

    try {
      // Sync room users with NotificationAPI
      await supabase.functions.invoke('notificationapi-webhook', {
        body: {
          action: 'sync_users',
          roomId,
        }
      });

      setIsConnected(true);
      console.log('NotificationAPI initialized for room:', roomId);
    } catch (error) {
      console.error('Failed to initialize NotificationAPI:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to real-time messaging",
        variant: "destructive",
      });
    }
  }, [user, roomId, toast]);

  // Send message via NotificationAPI
  const sendMessage = useCallback(async (message: string): Promise<boolean> => {
    if (!user || !roomId || !message.trim()) return false;

    const trimmed = message.trim();

    try {
      const { data, error } = await supabase.functions.invoke('notificationapi-webhook', {
        body: {
          action: 'send_message',
          roomId,
          message: trimmed,
          userId: user.id,
        }
      });

      if (error) throw error;

      // Optimistic local echo (widget-only state)
      const newMessage: NotificationAPIMessage = {
        message: trimmed,
        userId: user.id,
        roomId,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, newMessage]);

      return true;
    } catch (error) {
      console.warn('NotificationAPI failed, falling back to Supabase insert. Error:', error);

      // Fallback: store message directly in Supabase; realtime will deliver it
      const { error: insertError } = await supabase
        .from('room_messages')
        .insert({
          room_id: roomId,
          user_id: user.id,
          message: trimmed,
          message_type: 'text',
        });

      if (insertError) {
        console.error('Fallback insert failed:', insertError);
        toast({
          title: 'Error',
          description: 'Failed to send message',
          variant: 'destructive',
        });
        return false;
      }

      // Success via fallback
      return true;
    }
  }, [user, roomId, toast]);

  // Send typing indicator
  const sendTypingIndicator = useCallback(async (isTyping: boolean) => {
    if (!user || !roomId) return;

    // This would typically use NotificationAPI's presence feature
    // For now, we'll skip this implementation
    console.log('Typing indicator:', isTyping);
  }, [user, roomId]);

  useEffect(() => {
    if (roomId && user) {
      initializeNotificationAPI();
    }
  }, [roomId, user, initializeNotificationAPI]);

  return {
    isConnected,
    messages,
    sendMessage,
    sendTypingIndicator,
  };
}