-- Add columns to store resource data in learning_progress table
ALTER TABLE public.learning_progress 
ADD COLUMN videos jsonb DEFAULT '[]'::jsonb,
ADD COLUMN communities jsonb DEFAULT '[]'::jsonb,
ADD COLUMN articles jsonb DEFAULT '[]'::jsonb,
ADD COLUMN images jsonb DEFAULT '[]'::jsonb;