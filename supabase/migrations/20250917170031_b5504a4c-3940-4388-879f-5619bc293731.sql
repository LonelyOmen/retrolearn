-- Replace recursive room_members SELECT policy with security definer function to avoid infinite recursion

-- Drop the recursive policy if present
DROP POLICY IF EXISTS "Room members can view all members in their rooms" ON public.room_members;

-- Create a safe SELECT policy using existing security definer function
-- public.is_member_of_room(p_room_id uuid) RETURNS boolean SECURITY DEFINER
CREATE POLICY "Members can view room_members for their rooms"
ON public.room_members
FOR SELECT
TO authenticated
USING (
  public.is_member_of_room(room_members.room_id)
);
