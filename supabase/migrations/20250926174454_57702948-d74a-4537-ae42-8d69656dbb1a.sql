-- First, let's create a function to get quiz questions WITHOUT revealing correct answers
-- This function will be used when users are taking quizzes
CREATE OR REPLACE FUNCTION public.get_quiz_questions_for_attempt(p_quiz_id uuid)
RETURNS TABLE (
  id uuid,
  quiz_id uuid,
  question_number integer,
  question_text text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  created_at timestamp with time zone
) 
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Only return questions without correct answers for public quizzes or user's own quizzes
  SELECT 
    qq.id,
    qq.quiz_id,
    qq.question_number,
    qq.question_text,
    qq.option_a,
    qq.option_b,
    qq.option_c,
    qq.option_d,
    qq.created_at
  FROM quiz_questions qq
  JOIN quizzes q ON q.id = qq.quiz_id
  WHERE qq.quiz_id = p_quiz_id
    AND (q.is_public = true OR q.creator_id = auth.uid())
  ORDER BY qq.question_number;
$$;

-- Create a function to get quiz results WITH correct answers (only after quiz attempt)
CREATE OR REPLACE FUNCTION public.get_quiz_results_with_answers(p_quiz_id uuid, p_attempt_id uuid)
RETURNS TABLE (
  id uuid,
  quiz_id uuid,
  question_number integer,
  question_text text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  correct_answer character,
  user_answer character,
  is_correct boolean
) 
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Only return results with answers if user has completed this quiz attempt
  SELECT 
    qq.id,
    qq.quiz_id,
    qq.question_number,
    qq.question_text,
    qq.option_a,
    qq.option_b,
    qq.option_c,
    qq.option_d,
    qq.correct_answer,
    (qa.answers->>'q_' || qq.question_number::text)::character as user_answer,
    (qa.answers->>'q_' || qq.question_number::text) = qq.correct_answer as is_correct
  FROM quiz_questions qq
  JOIN quizzes q ON q.id = qq.quiz_id
  JOIN quiz_attempts qa ON qa.quiz_id = qq.quiz_id AND qa.id = p_attempt_id
  WHERE qq.quiz_id = p_quiz_id
    AND qa.user_id = auth.uid()
    AND qa.completed_at IS NOT NULL
  ORDER BY qq.question_number;
$$;

-- Update RLS policies to be more restrictive
-- Remove the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can view questions for public quizzes" ON quiz_questions;

-- Create new restrictive policies
-- Quiz creators can see everything (including correct answers)
CREATE POLICY "Quiz creators can view all question details" 
ON quiz_questions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM quizzes 
  WHERE quizzes.id = quiz_questions.quiz_id 
  AND quizzes.creator_id = auth.uid()
));

-- Regular users CANNOT directly access quiz_questions table
-- They must use the secure functions instead
CREATE POLICY "Block direct access to quiz questions for non-creators" 
ON quiz_questions 
FOR SELECT 
USING (false); -- This blocks all direct SELECT access for non-creators

-- The existing INSERT, UPDATE, DELETE policies for creators remain the same
-- No changes needed for those as they already properly restrict to quiz creators