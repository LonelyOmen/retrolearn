-- Realtime + RLS improvements for Work Rooms
-- 1) Ensure realtime works for key tables
ALTER TABLE public.room_messages REPLICA IDENTITY FULL;
ALTER TABLE public.room_members REPLICA IDENTITY FULL;
ALTER TABLE public.room_shared_notes REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_shared_notes;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 2) Allow room members to view each other's profiles (names/emails)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'Profiles visible to room members'
  ) THEN
    CREATE POLICY "Profiles visible to room members"
    ON public.profiles
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.room_members rm_self
        JOIN public.room_members rm_other
          ON rm_self.room_id = rm_other.room_id
        WHERE rm_self.user_id = auth.uid()
          AND rm_other.user_id = profiles.id
      )
    );
  END IF;
END $$;

-- 3) Allow room members to view all membership rows of their rooms
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'room_members' 
      AND policyname = 'Room members can view members of their rooms'
  ) THEN
    CREATE POLICY "Room members can view members of their rooms"
    ON public.room_members
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.room_members rm
        WHERE rm.room_id = room_members.room_id
          AND rm.user_id = auth.uid()
      )
    );
  END IF;
END $$;
