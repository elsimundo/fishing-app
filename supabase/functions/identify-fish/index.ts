import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const ANTHROPIC_MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-3-5-sonnet-latest'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FishIdentificationResult {
  species: string
  scientificName: string
  confidence: number
  keyFeatures: string[]
  alternatives: string[]
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'Missing Anthropic API key' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { imageBase64 } = await req.json()

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid image payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const prompt =
      'Identify this fish species caught in UK waters. Analyze the image carefully and provide:\n\n' +
      '1. Species name (UK common name)\n' +
      '2. Scientific name\n' +
      '3. Confidence level (0-100%) - be honest about uncertainty\n' +
      '4. Key identifying features you can see in this photo\n' +
      '5. Alternative species it might be if you\'re not certain\n\n' +
      'Important:\n' +
      '- Focus on UK fish species (saltwater and freshwater)\n' +
      '- Consider common confusion species (e.g., Sea Bass vs European Bass)\n' +
      '- If photo quality is poor, acknowledge it in confidence level\n' +
      '- List 2-3 alternatives if confidence is below 80%\n\n' +
      'Return response as JSON only (no markdown, no backticks):\n' +
      '{\n' +
      '  "species": "Sea Bass",\n' +
      '  "scientificName": "Dicentrarchus labrax",\n' +
      '  "confidence": 85,\n' +
      '  "keyFeatures": ["Silver body", "Black spot on gill cover", "Spiny dorsal fin", "Forked tail"],\n' +
      '  "alternatives": ["European Bass", "Striped Bass"]\n' +
      '}'

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageBase64,
                },
              },
            ],
          },
        ],
      }),
    })

    if (!anthropicRes.ok) {
      const text = await anthropicRes.text()
      console.error('Anthropic error:', anthropicRes.status, text)
      const status = anthropicRes.status === 429 ? 429 : 502
      return new Response(JSON.stringify({ error: 'Upstream AI error' }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const anthropicJson = await anthropicRes.json() as any

    const contentText =
      anthropicJson?.content?.[0]?.type === 'text' ? anthropicJson.content[0].text : null

    if (!contentText || typeof contentText !== 'string') {
      console.error('Unexpected Anthropic response shape:', anthropicJson)
      return new Response(JSON.stringify({ error: 'Invalid AI response' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let parsed: FishIdentificationResult
    try {
      parsed = JSON.parse(contentText)
    } catch (e) {
      console.error('Failed to parse AI JSON:', e, contentText)
      return new Response(JSON.stringify({ error: 'Parse error' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (
      !parsed ||
      typeof parsed.species !== 'string' ||
      typeof parsed.scientificName !== 'string' ||
      typeof parsed.confidence !== 'number' ||
      !Array.isArray(parsed.keyFeatures) ||
      !Array.isArray(parsed.alternatives)
    ) {
      console.error('Validation failed for AI result:', parsed)
      return new Response(JSON.stringify({ error: 'Invalid AI payload' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result: FishIdentificationResult = {
      species: parsed.species,
      scientificName: parsed.scientificName,
      confidence: parsed.confidence,
      keyFeatures: parsed.keyFeatures,
      alternatives: parsed.alternatives,
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('identify-fish function error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
