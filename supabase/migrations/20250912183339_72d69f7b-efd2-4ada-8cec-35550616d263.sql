-- Create work rooms table
CREATE TABLE public.work_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  creator_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create room members table
CREATE TABLE public.room_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.work_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Create room shared notes table  
CREATE TABLE public.room_shared_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.work_rooms(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL,
  shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, note_id)
);

-- Create room messages table
CREATE TABLE public.room_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.work_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.work_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_shared_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for work_rooms
CREATE POLICY "Users can view rooms they are members of" 
ON public.work_rooms 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_members 
    WHERE room_id = work_rooms.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create work rooms" 
ON public.work_rooms 
FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Room creators can update their rooms" 
ON public.work_rooms 
FOR UPDATE 
USING (auth.uid() = creator_id);

-- RLS Policies for room_members
CREATE POLICY "Users can view room members for their rooms" 
ON public.room_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_members rm 
    WHERE rm.room_id = room_members.room_id AND rm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can join rooms" 
ON public.room_members 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms" 
ON public.room_members 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for room_shared_notes
CREATE POLICY "Room members can view shared notes" 
ON public.room_shared_notes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_members 
    WHERE room_id = room_shared_notes.room_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Room members can share notes" 
ON public.room_shared_notes 
FOR INSERT 
WITH CHECK (
  auth.uid() = shared_by_user_id AND
  EXISTS (
    SELECT 1 FROM public.room_members 
    WHERE room_id = room_shared_notes.room_id AND user_id = auth.uid()
  )
);

-- RLS Policies for room_messages  
CREATE POLICY "Room members can view messages" 
ON public.room_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_members 
    WHERE room_id = room_messages.room_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Room members can send messages" 
ON public.room_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.room_members 
    WHERE room_id = room_messages.room_id AND user_id = auth.uid()
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_work_rooms_updated_at
BEFORE UPDATE ON public.work_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages
ALTER TABLE public.room_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;