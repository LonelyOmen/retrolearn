-- Allow creators to read their newly created rooms (fix create flow)
CREATE POLICY IF NOT EXISTS "Room creators can view their rooms"
ON public.work_rooms
FOR SELECT
USING (auth.uid() = creator_id);