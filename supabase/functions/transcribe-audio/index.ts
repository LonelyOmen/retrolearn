import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const cloudflareAccountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const cloudflareApiToken = Deno.env.get('CLOUDFLARE_API_TOKEN');

    if (!cloudflareAccountId || !cloudflareApiToken) {
      throw new Error('Cloudflare credentials not configured');
    }

    // Get the audio data from the request
    const audioBlob = await req.arrayBuffer();
    console.log('Received audio blob of size:', audioBlob.byteLength);

    // Convert to Uint8Array as required by Cloudflare Workers AI
    const audioArray = [...new Uint8Array(audioBlob)];

    // Call Cloudflare Workers AI Whisper model
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/run/@cf/openai/whisper`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cloudflareApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: audioArray,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudflare API error:', response.status, errorText);
      
      // Check if it's a quota limit error
      if (response.status === 429 || errorText.includes('quota') || errorText.includes('limit')) {
        return new Response(
          JSON.stringify({ 
            error: 'Daily voice limit reached — please try again tomorrow.',
            isQuotaError: true 
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      throw new Error(`Cloudflare API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('Transcription result:', result);

    return new Response(
      JSON.stringify({ text: result.text }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in transcribe-audio function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        isQuotaError: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
