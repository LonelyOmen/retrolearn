import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, query, title } = await req.json();

    if (action === 'search') {
      // Search Wikipedia articles
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
      
      console.log(`Searching Wikipedia for: ${query}`);
      
      const response = await fetch(searchUrl);
      const data = await response.json();
      
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (action === 'summary') {
      // Get article summary
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
      
      console.log(`Fetching Wikipedia summary for: ${title}`);
      
      const response = await fetch(summaryUrl);
      const data = await response.json();
      
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in wikipedia-search function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});