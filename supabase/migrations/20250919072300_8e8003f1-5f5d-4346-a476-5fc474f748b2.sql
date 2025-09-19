-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  creator_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_public BOOLEAN NOT NULL DEFAULT true
);

-- Create quiz questions table
CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  question_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quiz attempts table
CREATE TABLE public.quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 10,
  answers JSONB NOT NULL DEFAULT '{}',
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- RLS policies for quizzes
CREATE POLICY "Anyone can view public quizzes" 
ON public.quizzes 
FOR SELECT 
USING (is_public = true);

CREATE POLICY "Users can view their own quizzes" 
ON public.quizzes 
FOR SELECT 
USING (auth.uid() = creator_id);

CREATE POLICY "Users can create their own quizzes" 
ON public.quizzes 
FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own quizzes" 
ON public.quizzes 
FOR UPDATE 
USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own quizzes" 
ON public.quizzes 
FOR DELETE 
USING (auth.uid() = creator_id);

-- RLS policies for quiz questions
CREATE POLICY "Anyone can view questions for public quizzes" 
ON public.quiz_questions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.quizzes 
  WHERE quizzes.id = quiz_questions.quiz_id 
  AND (quizzes.is_public = true OR quizzes.creator_id = auth.uid())
));

CREATE POLICY "Users can create questions for their own quizzes" 
ON public.quiz_questions 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.quizzes 
  WHERE quizzes.id = quiz_questions.quiz_id 
  AND quizzes.creator_id = auth.uid()
));

CREATE POLICY "Users can update questions for their own quizzes" 
ON public.quiz_questions 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.quizzes 
  WHERE quizzes.id = quiz_questions.quiz_id 
  AND quizzes.creator_id = auth.uid()
));

CREATE POLICY "Users can delete questions for their own quizzes" 
ON public.quiz_questions 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.quizzes 
  WHERE quizzes.id = quiz_questions.quiz_id 
  AND quizzes.creator_id = auth.uid()
));

-- RLS policies for quiz attempts
CREATE POLICY "Users can view their own quiz attempts" 
ON public.quiz_attempts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quiz attempts" 
ON public.quiz_attempts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX idx_quizzes_creator_id ON public.quizzes(creator_id);
CREATE INDEX idx_quizzes_public ON public.quizzes(is_public);
CREATE INDEX idx_quiz_questions_quiz_id ON public.quiz_questions(quiz_id);
CREATE INDEX idx_quiz_questions_number ON public.quiz_questions(quiz_id, question_number);
CREATE INDEX idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_quizzes_updated_at
BEFORE UPDATE ON public.quizzes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();