-- Fix room member visibility so members can see all members in their rooms

-- 1) Drop overly restrictive policy
DROP POLICY IF EXISTS "Users can view their own room_members rows" ON public.room_members;

-- 2) Create permissive policy for room-scoped visibility
CREATE POLICY "Room members can view all members in their rooms"
ON public.room_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = room_members.room_id
      AND rm.user_id = auth.uid()
  )
);

-- Note: Existing INSERT/DELETE policies remain unchanged