import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const tavilyApiKey = Deno.env.get('TAVILY_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface ProcessingStep {
  step: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { noteId, content, enhanceWithInternet = false } = await req.json();
    
    console.log('Processing note:', { noteId, contentLength: content?.length, enhanceWithInternet });

    if (!noteId || !content) {
      throw new Error('Note ID and content are required');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Update note status to processing
    await supabase
      .from('notes')
      .update({ processing_status: 'processing' })
      .eq('id', noteId);

    let processedContent = content;
    let additionalContext = '';

    // Step 1: Enhance with internet research if requested
    if (enhanceWithInternet && tavilyApiKey) {
      console.log('Enhancing with internet research...');
      
      try {
        // Extract key topics for research
        const topicsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'Extract 2-3 key research topics from the provided notes. Return only the topics, one per line.'
              },
              {
                role: 'user',
                content: content
              }
            ],
            max_tokens: 150,
            temperature: 0.3,
          }),
        });

        const topicsData = await topicsResponse.json();
        const topics = topicsData.choices[0].message.content.split('\n').filter((t: string) => t.trim());

        // Research each topic
        for (const topic of topics.slice(0, 2)) { // Limit to 2 topics
          try {
            const tavilyResponse = await fetch('https://api.tavily.com/search', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                api_key: tavilyApiKey,
                query: topic.trim(),
                search_depth: 'basic',
                include_answer: true,
                include_raw_content: false,
                max_results: 3,
              }),
            });

            const tavilyData = await tavilyResponse.json();
            if (tavilyData.answer) {
              additionalContext += `\n\n## Research on "${topic.trim()}":\n${tavilyData.answer}`;
            }
          } catch (error) {
            console.error('Tavily research error for topic:', topic, error);
          }
        }
      } catch (error) {
        console.error('Internet enhancement error:', error);
      }
    }

    // Step 2: Generate comprehensive study materials
    console.log('Generating study materials...');
    
    const studyResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: `You are an expert educator creating comprehensive study materials. Create:
1. A clear, structured summary
2. Key points (5-8 bullet points)
3. Flashcards (8-12 cards with front/back)
4. Q&A pairs (6-10 questions with detailed answers)

Format your response as JSON with this structure:
{
  "summary": "detailed summary text",
  "keyPoints": ["point 1", "point 2", ...],
  "flashcards": [{"front": "question", "back": "answer"}, ...],
  "qa": [{"question": "question text", "answer": "detailed answer"}, ...]
}

Make the content educational, engaging, and comprehensive.`
          },
          {
            role: 'user',
            content: `Original Notes:\n${content}${additionalContext ? `\n\nAdditional Research Context:${additionalContext}` : ''}`
          }
        ],
        max_completion_tokens: 3000,
        response_format: { type: "json_object" }
      }),
    });

    const studyData = await studyResponse.json();
    
    if (!studyData.choices || !studyData.choices[0]) {
      throw new Error('Failed to generate study materials');
    }

    const studyMaterials = JSON.parse(studyData.choices[0].message.content);
    
    console.log('Generated study materials:', {
      summaryLength: studyMaterials.summary?.length,
      keyPointsCount: studyMaterials.keyPoints?.length,
      flashcardsCount: studyMaterials.flashcards?.length,
      qaCount: studyMaterials.qa?.length
    });

    // Step 3: Update note with generated content
    const { data: updatedNote, error: updateError } = await supabase
      .from('notes')
      .update({
        processing_status: 'completed',
        summary: studyMaterials.summary,
        key_points: studyMaterials.keyPoints,
        generated_flashcards: studyMaterials.flashcards,
        generated_qa: studyMaterials.qa,
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    console.log('Successfully processed note:', noteId);

    return new Response(JSON.stringify({
      success: true,
      note: updatedNote,
      enhancedWithInternet: enhanceWithInternet && additionalContext.length > 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-notes function:', error);
    
    // Try to update note status to error if we have the noteId
    try {
      const { noteId } = await req.json();
      if (noteId && supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase
          .from('notes')
          .update({ processing_status: 'error' })
          .eq('id', noteId);
      }
    } catch (updateError) {
      console.error('Failed to update note status to error:', updateError);
    }

    return new Response(JSON.stringify({ 
      error: error.message || 'An error occurred during processing',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});