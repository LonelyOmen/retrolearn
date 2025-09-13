-- Add missing foreign keys and open safe read policy to allow joining by code

-- 1) Foreign key relationships used by PostgREST embeds
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'room_members_user_id_fkey') THEN
    ALTER TABLE public.room_members
    ADD CONSTRAINT room_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'room_members_room_id_fkey') THEN
    ALTER TABLE public.room_members
    ADD CONSTRAINT room_members_room_id_fkey
    FOREIGN KEY (room_id) REFERENCES public.work_rooms(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'room_shared_notes_shared_by_user_id_fkey') THEN
    ALTER TABLE public.room_shared_notes
    ADD CONSTRAINT room_shared_notes_shared_by_user_id_fkey
    FOREIGN KEY (shared_by_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'room_shared_notes_note_id_fkey') THEN
    ALTER TABLE public.room_shared_notes
    ADD CONSTRAINT room_shared_notes_note_id_fkey
    FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'room_shared_notes_room_id_fkey') THEN
    ALTER TABLE public.room_shared_notes
    ADD CONSTRAINT room_shared_notes_room_id_fkey
    FOREIGN KEY (room_id) REFERENCES public.work_rooms(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_rooms_creator_id_fkey') THEN
    ALTER TABLE public.work_rooms
    ADD CONSTRAINT work_rooms_creator_id_fkey
    FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2) Ensure (room_id, user_id) is unique to avoid duplicate memberships
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'room_members_unique_room_user') THEN
    ALTER TABLE public.room_members
    ADD CONSTRAINT room_members_unique_room_user UNIQUE (room_id, user_id);
  END IF;
END $$;

-- 3) Allow reading rooms so users can join by code
DROP POLICY IF EXISTS "Anyone can view work rooms for joining" ON public.work_rooms;
CREATE POLICY "Anyone can view work rooms for joining"
ON public.work_rooms
FOR SELECT
USING (true);