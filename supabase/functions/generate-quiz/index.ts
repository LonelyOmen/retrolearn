import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to log API usage
async function logApiUsage(
  supabase: any,
  userId: string | null,
  functionName: string,
  apiProvider: string,
  apiModel: string,
  isFallback: boolean,
  status: string,
  errorMessage: string | null,
  responseTimeMs: number | null
) {
  try {
    await supabase.from('ai_api_usage').insert({
      user_id: userId,
      function_name: functionName,
      api_provider: apiProvider,
      api_model: apiModel,
      is_fallback: isFallback,
      status,
      error_message: errorMessage,
      response_time_ms: responseTimeMs
    });
  } catch (error) {
    console.error('Failed to log API usage:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openaiApiKey && !geminiApiKey) {
      throw new Error('No AI API keys configured');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { title, description, topic } = await req.json();

    if (!title || !topic) {
      throw new Error('Title and topic are required');
    }

    console.log('Generating quiz for topic:', topic);

    const geminiApiKeySecondary = Deno.env.get('GEMINI_API_KEY_SECONDARY');

    // Build prompt once
    const prompt = `You are a quiz generator. Create exactly 10 multiple choice questions with 4 options each (A, B, C, D).
            Each question should be challenging but fair, and cover different aspects of the topic.
            
            Format your response as a JSON object with this exact structure:
            {
              "questions": [
                {
                  "question_text": "The question text here?",
                  "option_a": "First option",
                  "option_b": "Second option", 
                  "option_c": "Third option",
                  "option_d": "Fourth option",
                  "correct_answer": "A"
                }
              ]
            }
            
            Make sure:
            - Exactly 10 questions
            - correct_answer is always one of: A, B, C, or D
            - Questions are varied and comprehensive
            - All options are plausible but only one is correct
            
            Create a quiz about: ${topic}`;

    let content;

    // Try OpenAI GPT-5 first
    if (openaiApiKey) {
      try {
        console.log('Trying GPT-5 for quiz generation');
        const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-5-2025-08-07',
            messages: [
              { role: 'system', content: 'You are a quiz generator that creates educational quizzes.' },
              { role: 'user', content: prompt }
            ],
            max_completion_tokens: 4000,
            response_format: { type: "json_object" }
          }),
        });

        if (gptResponse.ok) {
          const gptData = await gptResponse.json();
          content = gptData.choices[0].message.content;
          console.log('GPT-5 quiz generated successfully');
        } else {
          const errorText = await gptResponse.text();
          console.error('GPT-5 API error:', gptResponse.status, errorText);
          throw new Error(`GPT-5 failed: ${gptResponse.status}`);
        }
      } catch (error) {
        console.error('GPT-5 error, falling back to Gemini:', error);
      }
    }

    // Fallback to Gemini if GPT-5 failed or not available
    if (!content && geminiApiKey) {
      const callGemini = async (apiKey: string, model: string) => {
        const startTime = Date.now();
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }]}],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 4000,
              responseMimeType: 'application/json'
            }
          })
        });
        const data = await res.json();
        const responseTime = Date.now() - startTime;
        return { res, data, responseTime } as const;
      };

      // Try latest fast model first, then fallbacks and secondary key if quota
      let { res: aiRes, data: aiData, responseTime } = await callGemini(geminiApiKey, 'gemini-2.5-flash');
      let usedModel = 'gemini-2.5-flash';
      
      if (!aiRes.ok) {
        await logApiUsage(supabase, user.id, 'generate-quiz', 'gemini', usedModel, true, 'error', aiData?.error?.message || 'Unknown error', responseTime);
        
        const status = aiRes.status;
        const errMsg: string = aiData?.error?.message || 'Unknown error';
        const quotaLike = status === 429 || /quota|exceed|rate|insufficient/i.test(errMsg);

        // If quota-like or 5xx, try secondary key on the same model
        if ((quotaLike || status >= 500) && geminiApiKeySecondary) {
          console.log('Trying secondary key on gemini-2.5-flash');
          const retry = await callGemini(geminiApiKeySecondary, 'gemini-2.5-flash');
          aiRes = retry.res; aiData = retry.data; responseTime = retry.responseTime;
        }

        // If still not OK, try 1.5-flash then 1.5-flash-8b with whichever key available
        if (!aiRes.ok) {
          const keyForFlash = geminiApiKeySecondary ?? geminiApiKey;
          console.log('Falling back to gemini-1.5-flash');
          usedModel = 'gemini-1.5-flash';
          let fb = await callGemini(keyForFlash, usedModel);
          responseTime = fb.responseTime;
          
          if (!(fb.res.ok && fb.data?.candidates?.[0]?.content?.parts?.[0]?.text)) {
            await logApiUsage(supabase, user.id, 'generate-quiz', 'gemini', usedModel, true, 'error', fb.data?.error?.message || 'Unknown error', responseTime);
            console.log('1.5-flash failed, trying gemini-1.5-flash-8b');
            usedModel = 'gemini-1.5-flash-8b';
            fb = await callGemini(keyForFlash, usedModel);
            responseTime = fb.responseTime;
          }
          aiRes = fb.res; aiData = fb.data;
        }

        if (!aiRes.ok) {
          await logApiUsage(supabase, user.id, 'generate-quiz', 'gemini', usedModel, true, 'error', aiData?.error?.message || 'Unknown error', responseTime);
          console.error('Gemini API error for quiz generation:', { status: aiRes.status, body: aiData });
          throw new Error(`Gemini API error: ${aiRes.status}`);
        } else {
          await logApiUsage(supabase, user.id, 'generate-quiz', 'gemini', usedModel, true, 'success', null, responseTime);
        }
      } else {
        await logApiUsage(supabase, user.id, 'generate-quiz', 'gemini', usedModel, true, 'success', null, responseTime);
      }

      content = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    }

    if (!content) {
      throw new Error('No AI response received from any provider');
    }
    
    console.log('Gemini response:', content);

    let quizData;
    try {
      // Extract JSON even if wrapped in code fences
      let text = String(content).trim();
      const fenced = text.match(/```(?:json)?\n([\s\S]*?)```/i);
      if (fenced) text = fenced[1].trim();
      // Fallback: slice between first { and last }
      if (!fenced) {
        const first = text.indexOf('{');
        const last = text.lastIndexOf('}');
        if (first !== -1 && last !== -1) {
          text = text.slice(first, last + 1);
        }
      }
      quizData = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', content);
      throw new Error('Failed to parse AI response');
    }

    if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length !== 10) {
      console.error('Invalid quiz structure:', quizData);
      throw new Error('AI generated invalid quiz structure');
    }

    // Create the quiz in database
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        title,
        description: description || null,
        creator_id: user.id,
        is_public: true
      })
      .select()
      .single();

    if (quizError) {
      console.error('Error creating quiz:', quizError);
      throw new Error('Failed to create quiz');
    }

    console.log('Quiz created:', quiz.id);

    // Insert questions
    const questions = quizData.questions.map((q: any, index: number) => ({
      quiz_id: quiz.id,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      question_number: index + 1
    }));

    const { error: questionsError } = await supabase
      .from('quiz_questions')
      .insert(questions);

    if (questionsError) {
      console.error('Error creating questions:', questionsError);
      // Clean up the quiz if questions failed
      await supabase.from('quizzes').delete().eq('id', quiz.id);
      throw new Error('Failed to create quiz questions');
    }

    console.log('Quiz questions created successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      quiz_id: quiz.id,
      message: 'Quiz generated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-quiz function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ 
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});