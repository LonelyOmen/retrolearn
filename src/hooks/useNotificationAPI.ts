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

  // Ensure the current user is a member of the room before sending
  const ensureMembership = useCallback(async (): Promise<boolean> => {
    if (!user || !roomId) return false;

    try {
      const { data } = await supabase
        .from('room_members')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) return true; // already a member

      // Try to join as a regular member
      const { error: insertErr } = await supabase
        .from('room_members')
        .insert({ room_id: roomId, user_id: user.id, role: 'member' });

      if (insertErr) {
        // If unique violation, treat as success (race condition)
        if ((insertErr as any).code === '23505') return true;
        console.warn('Could not ensure membership:', insertErr);
        toast({
          title: 'Join required',
          description: 'You need to join this room before chatting. Use the room code to join.',
          variant: 'destructive',
        });
        return false;
      }

      return true;
    } catch (e) {
      console.warn('Membership check failed:', e);
      return false;
    }
  }, [user, roomId, toast]);

  // Send message via NotificationAPI
  const sendMessage = useCallback(async (message: string): Promise<boolean> => {
    if (!user || !roomId || !message.trim()) return false;

    // Ensure the user is allowed to post in this room
    const isMember = await ensureMembership();
    if (!isMember) return false;

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
  }, [user, roomId, toast, ensureMembership]);

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