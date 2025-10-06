-- Create table to track AI API usage
CREATE TABLE public.ai_api_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name TEXT NOT NULL,
  api_provider TEXT NOT NULL,
  api_model TEXT NOT NULL,
  is_fallback BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_api_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own API usage
CREATE POLICY "Users can view their own API usage"
ON public.ai_api_usage
FOR SELECT
USING (auth.uid() = user_id);

-- System can insert API usage records (called from edge functions)
CREATE POLICY "System can insert API usage records"
ON public.ai_api_usage
FOR INSERT
WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX idx_ai_api_usage_user_id ON public.ai_api_usage(user_id);
CREATE INDEX idx_ai_api_usage_created_at ON public.ai_api_usage(created_at DESC);
CREATE INDEX idx_ai_api_usage_function_name ON public.ai_api_usage(function_name);
CREATE INDEX idx_ai_api_usage_api_provider ON public.ai_api_usage(api_provider);

-- Add comment
COMMENT ON TABLE public.ai_api_usage IS 'Tracks which AI API (OpenAI GPT-5 or Gemini) was used for each request';