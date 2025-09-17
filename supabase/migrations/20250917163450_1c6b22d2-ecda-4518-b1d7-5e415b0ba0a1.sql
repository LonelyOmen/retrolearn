-- Add fields to track shared notes in the notes table
ALTER TABLE public.notes 
ADD COLUMN is_shared_note BOOLEAN DEFAULT FALSE,
ADD COLUMN shared_from_user_id UUID REFERENCES public.profiles(id),
ADD COLUMN shared_from_room_id UUID REFERENCES public.work_rooms(id),
ADD COLUMN original_note_id UUID;