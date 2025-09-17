import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { Database } from '@/integrations/supabase/types'

type Note = Database['public']['Tables']['notes']['Row']
type NewNote = Database['public']['Tables']['notes']['Insert']
type UpdateNote = Database['public']['Tables']['notes']['Update']

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [sharedNotes, setSharedNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()

  // Fetch user's notes (both regular and shared)
  const fetchNotes = async () => {
    if (!user) {
      setNotes([])
      setSharedNotes([])
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('notes')
        .select(`
          *,
          shared_from_profile:shared_from_user_id (
            full_name,
            email
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const allNotes = data || []
      const regularNotes = allNotes.filter(note => !note.is_shared_note)
      const sharedNotesData = allNotes.filter(note => note.is_shared_note)

      setNotes(regularNotes)
      setSharedNotes(sharedNotesData)
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch notes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Create a new note
  const createNote = async (noteData: Omit<NewNote, 'user_id'>): Promise<Note | null> => {
    if (!user) return null

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          ...noteData,
          user_id: user.id,
        })
        .select()
        .single()

      if (error) throw error

      setNotes(prev => [data, ...prev])
      
      toast({
        title: "Note created!",
        description: "Your note has been saved and is being processed.",
      })

      return data
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create note",
        variant: "destructive",
      })
      return null
    }
  }

  // Update a note
  const updateNote = async (id: string, updates: UpdateNote): Promise<Note | null> => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      setNotes(prev => prev.map(note => note.id === id ? data : note))
      return data
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update note",
        variant: "destructive",
      })
      return null
    }
  }

  // Delete a note
  const deleteNote = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)

      if (error) throw error

      setNotes(prev => prev.filter(note => note.id !== id))
      
      toast({
        title: "Note deleted",
        description: "Your note has been permanently deleted.",
      })

      return true
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      })
      return false
    }
  }

  useEffect(() => {
    fetchNotes()
  }, [user])

  return {
    notes,
    sharedNotes,
    loading,
    createNote,
    updateNote,
    deleteNote,
    refetch: fetchNotes,
  }
}