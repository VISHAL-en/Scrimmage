import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    let tag = ''

    if (req.method === 'POST') {
      try {
        const body = await req.json()
        tag = body?.tag || ''
      } catch {
        tag = ''
      }
    } else if (req.method === 'GET') {
      const url = new URL(req.url)
      tag = url.searchParams.get('tag') || ''
    }

    if (!tag || typeof tag !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing player tag parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Clean tag: strip leading #, remove spaces, uppercase
    const cleanTag = tag.trim().replace(/^#+/, '').toUpperCase()

    if (!cleanTag || cleanTag.length < 3) {
      return new Response(
        JSON.stringify({ error: 'Invalid or malformed player tag' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('BRAWL_API_KEY')
    if (!apiKey) {
      console.error('BRAWL_API_KEY environment variable is not set')
      return new Response(
        JSON.stringify({ error: 'Server configuration error: BRAWL_API_KEY missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const encodedTag = `%23${cleanTag}`
    
    // Primary: Brawl Stars specific RoyaleAPI proxy
    const primaryUrl = `https://bsproxy.royaleapi.dev/v1/players/${encodedTag}`
    const fallbackUrl = `https://proxy.royaleapi.dev/v1/players/${encodedTag}`

    console.log(`Fetching player stats from: ${primaryUrl}`)

    let res = await fetch(primaryUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      }
    })

    if (!res.ok && res.status !== 404) {
      console.log(`Trying fallback URL: ${fallbackUrl}`)
      res = await fetch(fallbackUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        }
      })
    }

    if (res.status === 404) {
      return new Response(
        JSON.stringify({ error: 'Player tag not found', notFound: true }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (res.status === 403 || res.status === 401) {
      const errBody = await res.text().catch(() => '')
      console.error('Unauthorized or invalid BRAWL_API_KEY:', errBody)
      return new Response(
        JSON.stringify({ error: 'Authentication error with Brawl Stars API proxy' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!res.ok) {
      console.error(`Brawl API error: status ${res.status}`)
      return new Response(
        JSON.stringify({ error: `Brawl Stars API error: ${res.statusText || res.status}` }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const playerData = await res.json()

    return new Response(
      JSON.stringify(playerData),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (err) {
    console.error('Unhandled exception in get-player-stats Edge Function:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
