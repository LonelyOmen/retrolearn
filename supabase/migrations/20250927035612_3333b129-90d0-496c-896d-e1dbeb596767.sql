-- Fix user answer extraction in results function (JSON key concatenation)
CREATE OR REPLACE FUNCTION public.get_quiz_results_with_answers(p_quiz_id uuid, p_attempt_id uuid)
RETURNS TABLE(
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
SET search_path TO 'public'
AS $function$
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
    (qa.answers->>('q_' || qq.question_number::text))::character AS user_answer,
    ((qa.answers->>('q_' || qq.question_number::text)) = qq.correct_answer) AS is_correct
  FROM quiz_questions qq
  JOIN quizzes q ON q.id = qq.quiz_id
  JOIN quiz_attempts qa ON qa.quiz_id = qq.quiz_id AND qa.id = p_attempt_id
  WHERE qq.quiz_id = p_quiz_id
    AND qa.user_id = auth.uid()
    AND qa.completed_at IS NOT NULL
  ORDER BY qq.question_number;
$function$;