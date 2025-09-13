-- Add missing foreign key constraints for proper table relationships
-- This fixes the "Could not find a relationship" errors

-- Add foreign keys for room_members table
ALTER TABLE public.room_members 
ADD CONSTRAINT room_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.room_members 
ADD CONSTRAINT room_members_room_id_fkey 
FOREIGN KEY (room_id) REFERENCES public.work_rooms(id) ON DELETE CASCADE;

-- Add foreign keys for room_shared_notes table  
ALTER TABLE public.room_shared_notes 
ADD CONSTRAINT room_shared_notes_shared_by_user_id_fkey 
FOREIGN KEY (shared_by_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.room_shared_notes 
ADD CONSTRAINT room_shared_notes_note_id_fkey 
FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE;

ALTER TABLE public.room_shared_notes 
ADD CONSTRAINT room_shared_notes_room_id_fkey 
FOREIGN KEY (room_id) REFERENCES public.work_rooms(id) ON DELETE CASCADE;

-- Add foreign key for work_rooms creator
ALTER TABLE public.work_rooms 
ADD CONSTRAINT work_rooms_creator_id_fkey 
FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;