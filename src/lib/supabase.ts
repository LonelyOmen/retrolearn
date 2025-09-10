import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          user_id: string
          title: string
          original_content: string
          summary: string | null
          key_points: string[] | null
          generated_flashcards: any
          generated_qa: any
          processing_status: 'pending' | 'processing' | 'completed' | 'failed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          original_content: string
          summary?: string | null
          key_points?: string[] | null
          generated_flashcards?: any
          generated_qa?: any
          processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          original_content?: string
          summary?: string | null
          key_points?: string[] | null
          generated_flashcards?: any
          generated_qa?: any
          processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
          created_at?: string
          updated_at?: string
        }
      }
      study_sessions: {
        Row: {
          id: string
          user_id: string
          note_id: string
          session_type: 'flashcards' | 'qa' | 'review'
          score: number
          total_items: number
          completed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          note_id: string
          session_type: 'flashcards' | 'qa' | 'review'
          score?: number
          total_items?: number
          completed_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          note_id?: string
          session_type?: 'flashcards' | 'qa' | 'review'
          score?: number
          total_items?: number
          completed_at?: string
          created_at?: string
        }
      }
    }
  }
}