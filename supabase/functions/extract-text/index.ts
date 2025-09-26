import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { image, mimeType } = await req.json()

    if (!image) {
      throw new Error('No image provided')
    }

    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    console.log('Processing image for text extraction...')

    const prompt = `Extract all text from this image. Please return only the extracted text content, maintaining the original formatting and structure as much as possible. If there are multiple sections, separate them clearly. If no text is found, return "No text detected in the image."`

    const imagePart = {
      inlineData: {
        data: image,
        mimeType: mimeType
      }
    }

    const result = await model.generateContent([prompt, imagePart])
    const response = await result.response
    const extractedText = response.text()

    console.log('Text extraction completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        extractedText: extractedText
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )

  } catch (error) {
    console.error('Error extracting text:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})