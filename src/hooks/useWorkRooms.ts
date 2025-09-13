import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { Database } from '@/integrations/supabase/types'

type WorkRoom = Database['public']['Tables']['work_rooms']['Row']
type RoomMember = Database['public']['Tables']['room_members']['Row']
type SharedNote = Database['public']['Tables']['room_shared_notes']['Row'] & {
  note: Database['public']['Tables']['notes']['Row']
}

export function useWorkRooms() {
  const [rooms, setRooms] = useState<WorkRoom[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()

  // Fetch user's rooms
  const fetchRooms = async () => {
    if (!user) {
      setRooms([])
      setLoading(false)
      return
    }

    try {
      // First get the room IDs where user is a member
      const { data: memberData, error: memberError } = await supabase
        .from('room_members')
        .select('room_id')
        .eq('user_id', user.id)

      if (memberError) throw memberError

      if (!memberData || memberData.length === 0) {
        setRooms([])
        setLoading(false)
        return
      }

      const roomIds = memberData.map(m => m.room_id)

      // Then get the room details
      const { data, error } = await supabase
        .from('work_rooms')
        .select('*')
        .in('id', roomIds)
        .order('created_at', { ascending: false })

      if (error) throw error

      setRooms(data || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch work rooms",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Generate unique room code
  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  // Create a new work room
  const createRoom = async (name: string, description?: string): Promise<WorkRoom | null> => {
    if (!user) return null

    try {
      const code = generateRoomCode()
      
      const { data: room, error: roomError } = await supabase
        .from('work_rooms')
        .insert({
          name,
          description,
          code,
          creator_id: user.id,
        })
        .select()
        .single()

      if (roomError) throw roomError

      // Add creator as member
      const { error: memberError } = await supabase
        .from('room_members')
        .insert({
          room_id: room.id,
          user_id: user.id,
          role: 'admin'
        })

      if (memberError) throw memberError

      setRooms(prev => [room, ...prev])
      
      toast({
        title: "Room created!",
        description: `Work room "${name}" created with code: ${code}`,
      })

      return room
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create work room",
        variant: "destructive",
      })
      return null
    }
  }

  // Join a room with code
  const joinRoom = async (code: string): Promise<WorkRoom | null> => {
    if (!user) return null

    try {
      // Find room by code
      const { data: room, error: roomError } = await supabase
        .from('work_rooms')
        .select('*')
        .eq('code', code.toUpperCase())
        .single()

      if (roomError) throw roomError

      // Add user as member
      const { error: memberError } = await supabase
        .from('room_members')
        .insert({
          room_id: room.id,
          user_id: user.id,
          role: 'member'
        })

      if (memberError) {
        if (memberError.code === '23505') { // Unique constraint violation
          toast({
            title: "Already a member",
            description: "You are already a member of this room",
            variant: "destructive",
          })
          return null
        }
        throw memberError
      }

      setRooms(prev => [room, ...prev])
      
      toast({
        title: "Joined room!",
        description: `Successfully joined "${room.name}"`,
      })

      return room
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message === 'No rows' ? "Room not found" : "Failed to join room",
        variant: "destructive",
      })
      return null
    }
  }

  // Leave a room
  const leaveRoom = async (roomId: string): Promise<boolean> => {
    if (!user) return false

    try {
      const { error } = await supabase
        .from('room_members')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', user.id)

      if (error) throw error

      setRooms(prev => prev.filter(room => room.id !== roomId))
      
      toast({
        title: "Left room",
        description: "You have left the work room",
      })

      return true
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to leave room",
        variant: "destructive",
      })
      return false
    }
  }

  // Get room members
  const getRoomMembers = async (roomId: string): Promise<RoomMember[]> => {
    try {
      const { data, error } = await supabase
        .from('room_members')
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .eq('room_id', roomId)
        .order('joined_at', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching room members:', error)
      return []
    }
  }

  // Share a note to room
  const shareNoteToRoom = async (roomId: string, noteId: string): Promise<boolean> => {
    if (!user) return false

    try {
      const { error } = await supabase
        .from('room_shared_notes')
        .insert({
          room_id: roomId,
          note_id: noteId,
          shared_by_user_id: user.id
        })

      if (error) {
        if (error.code === '23505') { // Already shared
          toast({
            title: "Already shared",
            description: "This note is already shared in the room",
            variant: "destructive",
          })
          return false
        }
        throw error
      }

      toast({
        title: "Note shared!",
        description: "Your note has been shared with the room",
      })

      return true
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to share note",
        variant: "destructive",
      })
      return false
    }
  }

  // Get shared notes for a room
  const getRoomSharedNotes = async (roomId: string): Promise<SharedNote[]> => {
    try {
      const { data, error } = await supabase
        .from('room_shared_notes')
        .select(`
          *,
          note:notes (*),
          profiles:shared_by_user_id (
            full_name,
            email
          )
        `)
        .eq('room_id', roomId)
        .order('shared_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching shared notes:', error)
      return []
    }
  }

  useEffect(() => {
    fetchRooms()
  }, [user])

  return {
    rooms,
    loading,
    createRoom,
    joinRoom,
    leaveRoom,
    getRoomMembers,
    shareNoteToRoom,
    getRoomSharedNotes,
    refetch: fetchRooms,
  }
}