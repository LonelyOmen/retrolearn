-- Drop the existing restrictive policy for viewing profiles  
DROP POLICY IF EXISTS "Profiles visible to room members" ON public.profiles;

-- Create a more permissive policy that allows room members to see each other's profiles
CREATE POLICY "Room members can view each other profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Users can see their own profile OR
  auth.uid() = id 
  OR
  -- Users can see profiles of people who are in the same room as them
  EXISTS (
    SELECT 1 
    FROM room_members rm1 
    JOIN room_members rm2 ON rm1.room_id = rm2.room_id 
    WHERE rm1.user_id = auth.uid() 
    AND rm2.user_id = profiles.id
  )
);