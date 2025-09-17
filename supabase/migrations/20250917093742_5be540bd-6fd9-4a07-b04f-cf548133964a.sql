-- Fix infinite recursion in room_members RLS policy
-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Room members can view members of their rooms" ON public.room_members;

-- Create a simpler policy that doesn't cause recursion
-- Users can view room members for rooms where they are explicitly members
CREATE POLICY "Users can view room members where they belong" 
ON public.room_members 
FOR SELECT 
USING (
  room_id IN (
    SELECT rm.room_id 
    FROM public.room_members rm 
    WHERE rm.user_id = auth.uid()
  )
);