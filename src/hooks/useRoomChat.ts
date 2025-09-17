import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { useNotificationAPI } from '@/hooks/useNotificationAPI'
import { Database } from '@/integrations/supabase/types'

type RoomMessage = Database['public']['Tables']['room_messages']['Row'] & {
  profiles?: {
    full_name: string | null
    email: string | null
  }
}

export function useRoomChat(roomId: string) {
  const [messages, setMessages] = useState<RoomMessage[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()
  const notificationAPI = useNotificationAPI(roomId)

  // Fetch messages for the room
  const fetchMessages = useCallback(async () => {
    if (!roomId) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('room_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Fetch profiles separately for each unique user_id
      const userIds = [...new Set(data?.map(msg => msg.user_id) || [])]
      const profilesData = await Promise.all(
        userIds.map(async (userId) => {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', userId)
            .single()
          
          if (profileError) {
            console.error('Error fetching profile for user:', userId, profileError)
          } else {
            console.log('Fetched profile for user:', userId, profile)
          }
          
          return { userId, profile }
        })
      )

      const profilesMap = Object.fromEntries(
        profilesData.map(p => [p.userId, p.profile])
      )

      const messagesWithProfiles = data?.map(msg => ({
        ...msg,
        profiles: profilesMap[msg.user_id]
      })) || []

      console.log('Final messages with profiles:', messagesWithProfiles)

      setMessages(messagesWithProfiles)
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch messages",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [roomId, toast])

  // Send a message (using NotificationAPI for real-time delivery)
  const sendMessage = async (message: string): Promise<boolean> => {
    if (!user || !roomId || !message.trim()) return false

    const trimmed = message.trim()

    // Use NotificationAPI for instant delivery
    const success = await notificationAPI.sendMessage(trimmed);
    
    if (success) {
      // Optimistic local echo so sender sees it instantly
      const tempMessage: RoomMessage = {
        id: `temp-${crypto.randomUUID()}` as any,
        room_id: roomId as any,
        user_id: user.id as any,
        message: trimmed,
        message_type: 'text',
        created_at: new Date().toISOString() as any,
        profiles: undefined,
      }
      setMessages(prev => [...prev, tempMessage])

      // Soft refresh from DB shortly after to replace temp with persisted row
      setTimeout(() => {
        fetchMessages()
      }, 300)

      return true;
    }

    return false;
  }

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!roomId) return

    fetchMessages()

    const channel = supabase
      .channel(`messages:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_messages',
          filter: `room_id=eq.${roomId}`
        },
        async (payload) => {
          console.log('New message received via realtime:', payload.new)

          // Get user profile for the new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', payload.new.user_id)
            .single()

          console.log('Profile for new message:', profile)
          const messageWithProfile = {
            ...payload.new,
            profiles: profile
          } as RoomMessage

          setMessages(prev => {
            // Check if message already exists (avoid duplicates)
            const exists = prev.some(msg => msg.id === messageWithProfile.id)
            if (!exists) {
              console.log('Adding new message to chat:', messageWithProfile)
              return [...prev, messageWithProfile]
            }
            console.log('Message already exists, skipping duplicate')
            return prev
          })
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
      })

    return () => {
      console.log('Cleaning up realtime subscription for room:', roomId)
      supabase.removeChannel(channel)
    }
  }, [roomId, fetchMessages])

  // Auto-refresh when NotificationAPI delivers messages (both send and receive)
  useEffect(() => {
    if (!roomId) return
    if (notificationAPI?.messages?.length) {
      const t = setTimeout(() => {
        fetchMessages()
      }, 300)
      return () => clearTimeout(t)
    }
  }, [roomId, notificationAPI?.messages, fetchMessages])
 
  return {
    messages,
    loading,
    sendMessage,
    refetch: fetchMessages,
    notificationAPI,
  }
}