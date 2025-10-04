-- Ensure full replica identity for realtime updates
ALTER TABLE room_messages REPLICA IDENTITY FULL;