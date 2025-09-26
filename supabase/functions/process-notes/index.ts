import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
const geminiApiKeySecondary = Deno.env.get('GEMINI_API_KEY_SECONDARY');
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
    const { noteId, content, enhanceWithInternet = false, images = [] } = requestBody;
    
    console.log('Processing note:', { noteId, contentLength: content?.length, enhanceWithInternet, imagesCount: images?.length });

    if (!noteId || (!content && (!images || images.length === 0))) {
      throw new Error('Note ID and either content or images are required');
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
        const topicsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
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
    
    const prompt = `You are an expert educator creating comprehensive study materials. Analyze the provided text notes and any images to create:
1. A clear, structured summary (include information from both text and images)
2. Key points (5-8 bullet points covering content from both sources)  
3. Flashcards (8-12 cards with front/back, incorporating visual and text content)
4. Q&A pairs (6-10 questions with detailed answers based on all provided content)

Format your response as JSON with this structure:
{
  "summary": "detailed summary text",
  "keyPoints": ["point 1", "point 2", ...],
  "flashcards": [{"front": "question", "back": "answer"}, ...],
  "qa": [{"question": "question text", "answer": "detailed answer"}, ...]
}

Make the content educational, engaging, and comprehensive. If images are provided, analyze them and incorporate their content into the study materials.

${content ? `Original Notes:\n${content}` : 'No text notes provided - analyze the images only.'}${additionalContext ? `\n\nAdditional Research Context:${additionalContext}` : ''}`;

    // Prepare the content array for multimodal input
    const contentParts: any[] = [{ text: prompt }];
    
    // Add images if provided
    if (images && images.length > 0) {
      console.log(`Including ${images.length} image(s) in processing...`);
      images.forEach((image: any) => {
        contentParts.push({
          inline_data: {
            data: image.data,
            mime_type: image.mimeType
          }
        });
      });
    }
    
    // Helper to call Gemini with a specific key/model
    const callGemini = async (apiKey: string, model: string) => {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: contentParts }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4000 }
        })
      });
      const data = await res.json();
      return { res, data } as const;
    };

    // Try primary key with Pro model
    let { res: studyResponse, data: studyData } = await callGemini(geminiApiKey!, 'gemini-1.5-pro');
    console.log('Study response status:', studyResponse.status);
    console.log('Study response data:', studyData);

    if (!studyResponse.ok) {
      const status = studyResponse.status;
      const errMsg: string = studyData.error?.message || 'Unknown error';
      console.error('Gemini API error:', { status, errMsg });

      const quotaLike = status === 429 || /quota|insufficient|exceed|rate/i.test(errMsg);

      // If quota on primary, try secondary key on Pro
      if (quotaLike && geminiApiKeySecondary) {
        console.log('Trying secondary key on gemini-1.5-pro');
        const retry = await callGemini(geminiApiKeySecondary, 'gemini-1.5-pro');
        studyResponse = retry.res; studyData = retry.data;
        console.log('Secondary key status:', studyResponse.status);
      }

      // If still not OK, try Flash model (prefer secondary if quota-like and available)
      if (!studyResponse.ok) {
        const keyForFlash = quotaLike && geminiApiKeySecondary ? geminiApiKeySecondary : geminiApiKey!;
        console.log('Attempting fallback to gemini-1.5-flash');
        let fb = await callGemini(keyForFlash, 'gemini-1.5-flash');
        if (!(fb.res.ok && fb.data.candidates && fb.data.candidates[0]?.content?.parts?.[0]?.text)) {
          console.log('Flash fallback failed, trying gemini-1.5-flash-8b');
          fb = await callGemini(keyForFlash, 'gemini-1.5-flash-8b');
        }
        if (fb.res.ok && fb.data.candidates && fb.data.candidates[0]?.content?.parts?.[0]?.text) {
          studyData = fb.data;
        } else {
          try {
            const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
            await supabase.from('notes').update({ processing_status: 'error' }).eq('id', noteId);
          } catch (_) {}
          const fbMsg = fb.data?.error?.message || errMsg;
          const finalStatus = fb.res.status || status;
          return new Response(
            JSON.stringify({ success: false, error: `Gemini error: ${fbMsg}`, provider_status: finalStatus, code: quotaLike ? 'GEMINI_QUOTA' : 'GEMINI_ERROR' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
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