import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
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

    // Generate quiz with Gemini
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a quiz generator. Create exactly 10 multiple choice questions with 4 options each (A, B, C, D). 
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
            
            Create a quiz about: ${topic}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4000,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates[0].content.parts[0].text;
    
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