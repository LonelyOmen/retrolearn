-- Fix recursive RLS on room_members causing 42P17 errors
-- Drop the recursive SELECT policy
DROP POLICY IF EXISTS "Users can view room members for their rooms" ON public.room_members;

-- Replace with a safe, non-recursive policy that allows users to read only their own membership rows
CREATE POLICY "Users can view their own room_members rows"
ON public.room_members
FOR SELECT
USING (auth.uid() = user_id);