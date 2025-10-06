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
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', userId)
            .maybeSingle()
          
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

  // Send a message (Supabase Realtime will deliver it instantly)
  const sendMessage = async (message: string): Promise<boolean> => {
    if (!user || !roomId || !message.trim()) return false

    const trimmed = message.trim()

    try {
      // Insert and optimistically update UI (Realtime will also deliver)
      const { data: inserted, error } = await supabase
        .from('room_messages')
        .insert({
          room_id: roomId,
          user_id: user.id,
          message: trimmed,
          message_type: 'text',
        })
        .select('*')
        .maybeSingle()

      if (error) throw error

      // Attach profile for immediate render
      let profile: RoomMessage['profiles'] | undefined = undefined
      const { data: p } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .maybeSingle()
      profile = p || undefined

      if (inserted) {
        const optimistic = { ...inserted, profiles: profile } as RoomMessage
        setMessages(prev => [...prev, optimistic])
      }

      return true
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      })
      return false
    }
  }

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!roomId) return

    fetchMessages()

    const channel = supabase
      .channel('schema-db-changes')
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
            .maybeSingle()

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

  return {
    messages,
    loading,
    sendMessage,
    refetch: fetchMessages,
  }
}