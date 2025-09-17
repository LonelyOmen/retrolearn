-- Enable real-time for room_messages table (so inserts stream to clients)
ALTER TABLE public.room_messages REPLICA IDENTITY FULL;

-- Add room_messages to the supabase_realtime publication if not already present
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public'
          AND tablename = 'room_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
    END IF;
END $$;