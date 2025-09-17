-- Remove recursive policy added earlier on room_members
DROP POLICY IF EXISTS "Users can view room members where they belong" ON public.room_members;

-- Ensure a safe non-recursive baseline policy remains to fetch the current user's memberships
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'room_members' AND policyname = 'Users can view their own room_members rows'
  ) THEN
    CREATE POLICY "Users can view their own room_members rows"
    ON public.room_members
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Optional: create a SECURITY DEFINER helper to check membership without triggering recursion
CREATE OR REPLACE FUNCTION public.is_member_of_room(p_room_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = p_room_id AND user_id = auth.uid()
  );
$$;