-- Add private quiz support and search functionality
-- First, let's verify current quiz structure and add any missing columns if needed

-- Add column to track if a quiz was just created (for post-creation actions)
ALTER TABLE public.quizzes 
ADD COLUMN IF NOT EXISTS just_created BOOLEAN DEFAULT false;

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_quizzes_title_search ON public.quizzes USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_quizzes_is_public ON public.quizzes (is_public);
CREATE INDEX IF NOT EXISTS idx_quizzes_creator_id ON public.quizzes (creator_id);

-- Update RLS policy to allow creators to see their private quizzes
DROP POLICY IF EXISTS "Users can view their private quizzes" ON public.quizzes;
CREATE POLICY "Users can view their private quizzes" 
ON public.quizzes 
FOR SELECT 
USING (auth.uid() = creator_id AND is_public = false);