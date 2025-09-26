-- Create user guide progress table
CREATE TABLE public.user_guide_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 0,
  completed_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_guide_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own guide progress" 
ON public.user_guide_progress 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own guide progress" 
ON public.user_guide_progress 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own guide progress" 
ON public.user_guide_progress 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own guide progress" 
ON public.user_guide_progress 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_guide_progress_updated_at
BEFORE UPDATE ON public.user_guide_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();