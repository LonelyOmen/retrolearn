-- Create learning_progress table to track user learning topics
CREATE TABLE public.learning_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  topic TEXT NOT NULL,
  progress_percentage INTEGER NOT NULL DEFAULT 0,
  learning_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_steps INTEGER NOT NULL DEFAULT 0, 
  completed_steps INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  overview TEXT,
  tips JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own learning progress" 
ON public.learning_progress 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own learning progress" 
ON public.learning_progress 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning progress" 
ON public.learning_progress 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own learning progress" 
ON public.learning_progress 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_learning_progress_updated_at
BEFORE UPDATE ON public.learning_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();