import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
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

  let requestBody: any;
  try {
    requestBody = await req.json();
    const { noteId, content, enhanceWithInternet = false } = requestBody;
    
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
        // Extract key topics for research using Gemini
        const topicsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Extract 2-3 key research topics from the provided notes. Return only the topics, one per line.\n\nNotes: ${content}`
              }]
            }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 150,
            }
          }),
        });

        const topicsData = await topicsResponse.json();
        console.log('Topics response:', topicsData);
        
        if (!topicsData.candidates || !topicsData.candidates[0] || !topicsData.candidates[0].content) {
          console.error('Invalid topics response format:', topicsData);
          throw new Error('Failed to extract topics from Gemini response');
        }
        
        const topics = topicsData.candidates[0].content.parts[0].text.split('\n').filter((t: string) => t.trim());

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

    // Step 2: Generate comprehensive study materials using Gemini
    console.log('Generating study materials...');
    
    const studyResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are an expert educator creating comprehensive study materials. Create:
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

Make the content educational, engaging, and comprehensive.

Original Notes:
${content}${additionalContext ? `\n\nAdditional Research Context:${additionalContext}` : ''}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4000,
        }
      }),
    });

    const studyData = await studyResponse.json();
    console.log('Study response status:', studyResponse.status);
    console.log('Study response data:', studyData);
    
    if (!studyResponse.ok) {
      console.error('Gemini API error:', studyData);
      const status = studyResponse.status;
      const errMsg: string = studyData.error?.message || 'Unknown error';

      // Attempt fallback to a cheaper model if quota or permission issues
      const shouldFallback = status === 429 || /quota|insufficient|exceed/i.test(errMsg);
      if (shouldFallback) {
        console.log('Attempting fallback to gemini-1.5-flash-latest');
        const fallbackRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}` , {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are an expert educator creating comprehensive study materials. Create:\n1. A clear, structured summary\n2. Key points (5-8 bullet points)\n3. Flashcards (8-12 cards with front/back)\n4. Q&A pairs (6-10 questions with detailed answers)\n\nFormat your response as JSON with this structure:\n{\n  "summary": "detailed summary text",\n  "keyPoints": ["point 1", "point 2", ...],\n  "flashcards": [{"front": "question", "back": "answer"}, ...],\n  "qa": [{"question": "question text", "answer": "detailed answer"}, ...]\n}\n\nMake the content educational, engaging, and comprehensive.\n\nOriginal Notes:\n${content}${additionalContext ? `\n\nAdditional Research Context:${additionalContext}` : ''}`
              }]
            }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 3500 }
          })
        });
        const fbData = await fallbackRes.json();
        console.log('Fallback status:', fallbackRes.status);
        if (fallbackRes.ok && fbData.candidates && fbData.candidates[0]?.content?.parts?.[0]?.text) {
          // Overwrite studyData to reuse parsing logic below
          (studyData as any).candidates = fbData.candidates;
        } else {
          // Update note status and return error with accurate status code
          try {
            const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
            await supabase.from('notes').update({ processing_status: 'error' }).eq('id', noteId);
          } catch (_) {}
          const fbMsg = fbData.error?.message || errMsg;
          return new Response(JSON.stringify({ success: false, error: `Gemini quota/limit error: ${fbMsg}`, code: 'GEMINI_QUOTA' }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      } else {
        // Non-fallback-able error: return with provider status
        try {
          const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
          await supabase.from('notes').update({ processing_status: 'error' }).eq('id', noteId);
        } catch (_) {}
        return new Response(JSON.stringify({ success: false, error: `Gemini API error: ${errMsg}` }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }
    
    if (!studyData.candidates || !studyData.candidates[0] || !studyData.candidates[0].content) {
      console.error('Invalid study response format:', studyData);
      throw new Error('Failed to generate study materials - invalid response format');
    }

    let studyMaterials;
    try {
      const responseText = studyData.candidates[0].content.parts[0].text;
      // Clean up response text to extract JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : responseText;
      studyMaterials = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.log('Raw response text:', studyData.candidates[0].content.parts[0].text);
      throw new Error('Failed to parse study materials from response');
    }
    
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
      if (requestBody?.noteId && supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase
          .from('notes')
          .update({ processing_status: 'error' })
          .eq('id', requestBody.noteId);
      }
    } catch (updateError) {
      console.error('Failed to update note status to error:', updateError);
    }

    const errorMessage = error instanceof Error ? error.message : 'An error occurred during processing';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});