import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const githubPat = Deno.env.get('GITHUB_PAT');
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

  let requestBody: any;
  try {
    requestBody = await req.json();
    const { noteId, content, enhanceWithInternet = false, images = [] } = requestBody;
    
    console.log('Processing note:', { noteId, contentLength: content?.length, enhanceWithInternet, imagesCount: images?.length });

    if (!noteId || (!content && (!images || images.length === 0))) {
      throw new Error('Note ID and either content or images are required');
    }

    if (!githubPat && !geminiApiKey) {
      throw new Error('No AI API keys configured');
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Get user_id from the note for logging
    const { data: noteData } = await supabase
      .from('notes')
      .select('user_id')
      .eq('id', noteId)
      .single();
    
    const userId = noteData?.user_id || null;

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
        // Extract key topics - try GitHub Models GPT-5 first
        let topics: string[] = [];
        
        if (githubPat) {
          try {
            const topicsPrompt = `Extract 2-3 key research topics from the provided notes. Return them as a JSON array of strings.\n\nNotes: ${content}`;
            const topicsResponse = await fetch('https://models.inference.ai.azure.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${githubPat}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'gpt-5',
                messages: [
                  { role: 'system', content: 'You are a research assistant.' },
                  { role: 'user', content: topicsPrompt }
                ],
                max_completion_tokens: 150,
                response_format: { type: "json_object" }
              }),
            });

            if (topicsResponse.ok) {
              const topicsData = await topicsResponse.json();
              const parsed = JSON.parse(topicsData.choices[0].message.content);
              topics = parsed.topics || Object.values(parsed)[0] || [];
            }
          } catch (error) {
            console.log('GitHub Models GPT-5 topic extraction failed:', error);
          }
        }

        // Fallback to Gemini
        if (topics.length === 0 && geminiApiKey) {
          const startTime = Date.now();
          try {
            const topicsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
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

            const responseTime = Date.now() - startTime;
            const topicsData = await topicsResponse.json();
            
            if (topicsResponse.ok && topicsData.candidates?.[0]?.content?.parts?.[0]?.text) {
              topics = topicsData.candidates[0].content.parts[0].text.split('\n').filter((t: string) => t.trim());
              await logApiUsage(supabase, userId, 'process-notes-topics', 'gemini', 'gemini-2.5-flash', true, 'success', null, responseTime);
            } else {
              await logApiUsage(supabase, userId, 'process-notes-topics', 'gemini', 'gemini-2.5-flash', true, 'error', topicsData.error?.message || 'Unknown error', responseTime);
            }
          } catch (error) {
            await logApiUsage(supabase, userId, 'process-notes-topics', 'gemini', 'gemini-2.5-flash', true, 'error', error instanceof Error ? error.message : 'Unknown error', Date.now() - startTime);
          }
        }

        // Research each topic with Tavily
        for (const topic of topics.slice(0, 2)) {
          try {
            const tavilyResponse = await fetch('https://api.tavily.com/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
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

    let studyData;
    let rawResponseText;

    // Try GitHub Models GPT-5 first
    if (githubPat) {
      const startTime = Date.now();
      try {
        console.log('Trying GitHub Models GPT-5 for study materials');
        const messages: any[] = [
          { role: 'system', content: 'You are an expert educational assistant.' }
        ];

        // Handle images
        if (images && images.length > 0) {
          const contentParts: any[] = [{ type: 'text', text: prompt }];
          
          for (const img of images) {
            contentParts.push({
              type: 'image_url',
              image_url: {
                url: `data:${img.mimeType};base64,${img.data}`
              }
            });
          }
          
          messages.push({ role: 'user', content: contentParts });
        } else {
          messages.push({ role: 'user', content: prompt });
        }

        const gptResponse = await fetch('https://models.inference.ai.azure.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${githubPat}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-5',
            messages,
            max_completion_tokens: 4000,
            response_format: { type: "json_object" }
          }),
        });

        const responseTime = Date.now() - startTime;

        if (gptResponse.ok) {
          const gptData = await gptResponse.json();
          rawResponseText = gptData.choices[0].message.content;
          studyData = JSON.parse(rawResponseText);
          console.log('GitHub Models GPT-5 study materials generated successfully');
          await logApiUsage(supabase, userId, 'process-notes', 'github-models', 'gpt-5', false, 'success', null, responseTime);
        } else {
          const errorText = await gptResponse.text();
          console.error('GitHub Models GPT-5 API error:', gptResponse.status, errorText);
          await logApiUsage(supabase, userId, 'process-notes', 'github-models', 'gpt-5', false, 'error', `Status ${gptResponse.status}: ${errorText}`, responseTime);
        }
      } catch (error) {
        const responseTime = Date.now() - startTime;
        console.error('GitHub Models GPT-5 error, falling back to Gemini:', error);
        await logApiUsage(supabase, userId, 'process-notes', 'github-models', 'gpt-5', false, 'error', error instanceof Error ? error.message : 'Unknown error', responseTime);
      }
    }

    // Fallback to Gemini
    if (!studyData && geminiApiKey) {
      console.log('Using Gemini for study materials');
      
      const contentParts: any[] = [{ text: prompt }];
      
      if (images && images.length > 0) {
        console.log(`Including ${images.length} image(s)`);
        images.forEach((image: any) => {
          contentParts.push({
            inline_data: {
              data: image.data,
              mime_type: image.mimeType
            }
          });
        });
      }
      
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

      const startTime = Date.now();
      let { res: studyResponse, data: geminiData } = await callGemini(geminiApiKey, 'gemini-2.5-flash');
      let responseTime = Date.now() - startTime;
      let usedModel = 'gemini-2.5-flash';
      let isFallback = true;

      if (!studyResponse.ok) {
        await logApiUsage(supabase, userId, 'process-notes', 'gemini', usedModel, isFallback, 'error', geminiData.error?.message || 'Unknown error', responseTime);
        
        const quotaLike = studyResponse.status === 429 || /quota|insufficient|exceed|rate/i.test(geminiData.error?.message || '');

        if (quotaLike && geminiApiKeySecondary) {
          console.log('Trying secondary Gemini key');
          const retryStart = Date.now();
          const retry = await callGemini(geminiApiKeySecondary, 'gemini-2.5-flash');
          responseTime = Date.now() - retryStart;
          studyResponse = retry.res; geminiData = retry.data;
        }

        if (!studyResponse.ok) {
          const keyForFlash = quotaLike && geminiApiKeySecondary ? geminiApiKeySecondary : geminiApiKey;
          console.log('Falling back to Flash Lite model');
          usedModel = 'gemini-2.5-flash-lite';
          const fbStart = Date.now();
          const fb = await callGemini(keyForFlash, usedModel);
          responseTime = Date.now() - fbStart;
          
          if (fb.res.ok && fb.data.candidates?.[0]?.content?.parts?.[0]?.text) {
            geminiData = fb.data;
            studyResponse = fb.res;
            await logApiUsage(supabase, userId, 'process-notes', 'gemini', usedModel, isFallback, 'success', null, responseTime);
          } else {
            await logApiUsage(supabase, userId, 'process-notes', 'gemini', usedModel, isFallback, 'error', fb.data.error?.message || 'Unknown error', responseTime);
            await supabase.from('notes').update({ processing_status: 'failed' }).eq('id', noteId);
            return new Response(
              JSON.stringify({ success: false, error: 'All AI providers failed' }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          await logApiUsage(supabase, userId, 'process-notes', 'gemini', usedModel, isFallback, 'success', null, responseTime);
        }
      } else {
        await logApiUsage(supabase, userId, 'process-notes', 'gemini', usedModel, isFallback, 'success', null, responseTime);
      }
      
      if (geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
        rawResponseText = geminiData.candidates[0].content.parts[0].text;
        const jsonMatch = rawResponseText.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? jsonMatch[0] : rawResponseText;
        studyData = JSON.parse(jsonText);
      }
    }

    if (!studyData) {
      throw new Error('No AI response received from any provider');
    }
    
    console.log('Generated study materials:', {
      summaryLength: studyData.summary?.length,
      keyPointsCount: studyData.keyPoints?.length,
      flashcardsCount: studyData.flashcards?.length,
      qaCount: studyData.qa?.length
    });

    // Step 3: Update note with generated content
    const { data: updatedNote, error: updateError } = await supabase
      .from('notes')
      .update({
        processing_status: 'completed',
        summary: studyData.summary,
        key_points: studyData.keyPoints,
        generated_flashcards: studyData.flashcards,
        generated_qa: studyData.qa,
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
    
    try {
      if (requestBody?.noteId && supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase
          .from('notes')
          .update({ processing_status: 'failed' })
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
