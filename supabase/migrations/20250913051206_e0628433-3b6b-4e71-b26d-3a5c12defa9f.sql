-- Allow creators to read their newly created rooms (fix create flow)
DROP POLICY IF EXISTS "Room creators can view their rooms" ON public.work_rooms;
CREATE POLICY "Room creators can view their rooms"
ON public.work_rooms
FOR SELECT
USING (auth.uid() = creator_id);