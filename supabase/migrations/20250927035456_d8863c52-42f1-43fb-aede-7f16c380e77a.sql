-- Add update policy for quiz_attempts so users can update their own attempts
CREATE POLICY "Users can update their own quiz attempts" 
ON public.quiz_attempts 
FOR UPDATE 
USING (auth.uid() = user_id);