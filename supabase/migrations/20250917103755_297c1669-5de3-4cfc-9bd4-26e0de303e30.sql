-- Enable real-time for room_messages table
ALTER TABLE public.room_messages REPLICA IDENTITY FULL;

-- Add room_messages to the realtime publication if not already added
DO $$ 
BEGIN
    -- Check if room_messages is already in the publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'room_messages'
    ) THEN
        -- Add the table to the publication
        ALTER PUBLICATION supabase_realtime ADD TABLE room_messages;
    END IF;
END $$;