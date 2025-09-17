-- Fix infinite recursion by using security definer function

-- Create a security definer function to check if users share any rooms
CREATE OR REPLACE FUNCTION public.users_share_room(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM room_members rm1 
    JOIN room_members rm2 ON rm1.room_id = rm2.room_id 
    WHERE rm1.user_id = user1_id 
    AND rm2.user_id = user2_id
  );
$$;

-- Drop and recreate the profiles policy using the function
DROP POLICY IF EXISTS "Room members can view each other profiles" ON public.profiles;

CREATE POLICY "Room members can view each other profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Users can see their own profile OR
  auth.uid() = id 
  OR
  -- Users can see profiles of people who share rooms with them
  public.users_share_room(auth.uid(), id)
);