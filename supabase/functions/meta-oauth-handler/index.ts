import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MetaOAuthRequest {
  action: 'initiate' | 'callback'
  workspaceId?: string
  integrationId?: string
  name?: string
  appId?: string
  appSecret?: string
  selectedPipelineId?: string
  selectedTagIds?: string[]
  code?: string
  state?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify user authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const requestData = await req.json() as MetaOAuthRequest
    console.log('Meta OAuth request:', requestData)

    if (requestData.action === 'initiate') {
      // Generate state parameter for OAuth security
      const state = crypto.randomUUID()
      const redirectUri = `${req.url.replace('/meta-oauth-handler', '')}/meta-oauth-handler`
      
      // Store OAuth state temporarily
      const { error } = await supabase
        .from('meta_integrations')
        .upsert({
          id: requestData.integrationId,
          workspace_id: requestData.workspaceId,
          name: requestData.name || 'Meta Integration',
          meta_app_id: requestData.appId,
          app_secret: requestData.appSecret,
          access_token: 'pending',
          webhook_verify_token: crypto.randomUUID(),
          selected_pipeline_id: requestData.selectedPipelineId || null,
          selected_tag_ids: requestData.selectedTagIds || [],
          field_mapping: {},
          is_active: false
        })

      if (error) {
        console.error('Error creating integration:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to create integration' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Generate Meta OAuth URL
      const params = new URLSearchParams({
        client_id: requestData.appId!,
        redirect_uri: redirectUri,
        state: state,
        scope: 'leads_retrieval,pages_show_list,pages_read_engagement'
      })

      const oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`

      return new Response(
        JSON.stringify({ 
          success: true, 
          oauth_url: oauthUrl,
          state: state
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (requestData.action === 'callback') {
      // Exchange authorization code for access token
      const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: requestData.appId!,
          client_secret: requestData.appSecret!,
          redirect_uri: `${req.url}`,
          code: requestData.code!
        })
      })

      const tokenData = await tokenResponse.json()
      
      if (tokenData.error) {
        console.error('Meta OAuth error:', tokenData.error)
        return new Response(
          JSON.stringify({ error: 'OAuth authentication failed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update integration with access token
      const { error } = await supabase
        .from('meta_integrations')
        .update({
          access_token: tokenData.access_token,
          is_active: true
        })
        .eq('id', requestData.integrationId)

      if (error) {
        console.error('Error updating integration:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to update integration' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          access_token: tokenData.access_token
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Meta OAuth handler error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})