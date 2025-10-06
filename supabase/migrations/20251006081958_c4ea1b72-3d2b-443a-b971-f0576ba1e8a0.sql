-- Enable realtime replication for chat-related tables
-- Add tables to supabase_realtime publication and ensure full row data for changes

-- Ensure full row data is captured for realtime
ALTER TABLE public.room_messages REPLICA IDENTITY FULL;
ALTER TABLE public.room_members REPLICA IDENTITY FULL;
ALTER TABLE public.room_shared_notes REPLICA IDENTITY FULL;

-- Add tables to realtime publication (ignore if already added)
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages';
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- already added
  END;

  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members';
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- already added
  END;

  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.room_shared_notes';
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- already added
  END;
END $$;