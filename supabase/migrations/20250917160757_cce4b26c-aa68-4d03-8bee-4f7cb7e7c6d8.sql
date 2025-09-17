-- Allow room creators to delete their own work rooms
CREATE POLICY "Room creators can delete their rooms" 
ON public.work_rooms 
FOR DELETE 
USING (auth.uid() = creator_id);