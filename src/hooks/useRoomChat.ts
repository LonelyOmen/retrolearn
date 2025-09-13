import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
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
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', userId)
            .single()
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

  // Send a message
  const sendMessage = async (message: string): Promise<boolean> => {
    if (!user || !roomId || !message.trim()) return false

    try {
      const { data, error } = await supabase
        .from('room_messages')
        .insert({
          room_id: roomId,
          user_id: user.id,
          message: message.trim(),
        })
        .select('*')
        .single()

      if (error) throw error

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single()

      const messageWithProfile = {
        ...data,
        profiles: profile
      }

      // Optimistically add the message
      setMessages(prev => [...prev, messageWithProfile])

      return true
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      })
      return false
    }
  }

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!roomId) return

    fetchMessages()

    const channel = supabase
      .channel(`room-messages-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_messages',
          filter: `room_id=eq.${roomId}`
        },
        async (payload) => {
          // Skip if this is our own message (already added optimistically)
          if (payload.new.user_id === user?.id) {
            return
          }

          // Get user profile for the new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', payload.new.user_id)
            .single()

          const messageWithProfile = {
            ...payload.new,
            profiles: profile
          } as RoomMessage

          setMessages(prev => {
            // Check if message already exists (avoid duplicates)
            const exists = prev.some(msg => msg.id === messageWithProfile.id)
            if (!exists) {
              return [...prev, messageWithProfile]
            }
            return prev
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, user?.id, fetchMessages])

  return {
    messages,
    loading,
    sendMessage,
    refetch: fetchMessages,
  }
}