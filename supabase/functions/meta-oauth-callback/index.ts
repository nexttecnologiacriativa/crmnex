import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const url = new URL(req.url)
    
    // Handle GET request (redirect from Meta OAuth)
    if (req.method === 'GET') {
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state') // This is the integration_id
      const error = url.searchParams.get('error')
      const errorDescription = url.searchParams.get('error_description')

      console.log('🔐 OAuth callback received:', { 
        hasCode: !!code, 
        state, 
        error,
        errorDescription 
      });

      // Get the frontend URL for redirects
      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://mqotdnvwyjhyiqzbefpm.lovable.app'

      // Handle OAuth errors
      if (error) {
        console.error('❌ OAuth error from Meta:', error, errorDescription);
        return Response.redirect(
          `${frontendUrl}/auth/meta/callback?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`,
          302
        )
      }

      if (!code || !state) {
        console.error('❌ Missing code or state parameter');
        return Response.redirect(
          `${frontendUrl}/auth/meta/callback?error=missing_params`,
          302
        )
      }

      // Get integration details to retrieve app credentials
      const { data: integration, error: integrationError } = await supabase
        .from('meta_integrations')
        .select('*')
        .eq('id', state)
        .single()

      if (integrationError || !integration) {
        console.error('❌ Integration not found:', integrationError);
        return Response.redirect(
          `${frontendUrl}/auth/meta/callback?error=integration_not_found`,
          302
        )
      }

      console.log('✅ Integration found:', integration.name);

      // Build the redirect URI (same as used in initiation)
      const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/meta-oauth-callback`

      // Exchange authorization code for access token
      const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token')
      tokenUrl.searchParams.set('client_id', integration.meta_app_id)
      tokenUrl.searchParams.set('client_secret', integration.app_secret)
      tokenUrl.searchParams.set('redirect_uri', redirectUri)
      tokenUrl.searchParams.set('code', code)

      console.log('🔄 Exchanging code for token...');

      const tokenResponse = await fetch(tokenUrl.toString())
      const tokenData = await tokenResponse.json()

      if (tokenData.error) {
        console.error('❌ Token exchange error:', tokenData.error);
        return Response.redirect(
          `${frontendUrl}/auth/meta/callback?error=token_exchange_failed&details=${encodeURIComponent(tokenData.error.message || '')}`,
          302
        )
      }

      console.log('✅ Token received, exchanging for long-lived token...');

      // Exchange for long-lived token
      const longLivedUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token')
      longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token')
      longLivedUrl.searchParams.set('client_id', integration.meta_app_id)
      longLivedUrl.searchParams.set('client_secret', integration.app_secret)
      longLivedUrl.searchParams.set('fb_exchange_token', tokenData.access_token)

      const longLivedResponse = await fetch(longLivedUrl.toString())
      const longLivedData = await longLivedResponse.json()

      const finalToken = longLivedData.access_token || tokenData.access_token
      
      console.log('✅ Long-lived token obtained');

      // Update integration with access token
      const { error: updateError } = await supabase
        .from('meta_integrations')
        .update({
          access_token: finalToken,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', state)

      if (updateError) {
        console.error('❌ Error updating integration:', updateError);
        return Response.redirect(
          `${frontendUrl}/auth/meta/callback?error=update_failed`,
          302
        )
      }

      console.log('✅ Integration updated successfully');

      // Automatically sync forms after successful OAuth
      try {
        console.log('🔄 Auto-syncing forms...');
        await supabase.functions.invoke('meta-forms-manager', {
          body: {
            action: 'sync_forms',
            integration_id: state
          }
        })
        console.log('✅ Forms synced');
      } catch (syncError) {
        console.warn('⚠️ Form sync failed (non-critical):', syncError);
      }

      // Redirect to frontend success page
      return Response.redirect(
        `${frontendUrl}/auth/meta/callback?success=true&integration_id=${state}`,
        302
      )
    }

    // Handle POST request (for programmatic token exchange)
    if (req.method === 'POST') {
      const { integration_id, code } = await req.json()

      if (!integration_id || !code) {
        return new Response(
          JSON.stringify({ error: 'integration_id and code are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get integration details
      const { data: integration, error: integrationError } = await supabase
        .from('meta_integrations')
        .select('*')
        .eq('id', integration_id)
        .single()

      if (integrationError || !integration) {
        return new Response(
          JSON.stringify({ error: 'Integration not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Exchange code for token
      const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/meta-oauth-callback`
      
      const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token')
      tokenUrl.searchParams.set('client_id', integration.meta_app_id)
      tokenUrl.searchParams.set('client_secret', integration.app_secret)
      tokenUrl.searchParams.set('redirect_uri', redirectUri)
      tokenUrl.searchParams.set('code', code)

      const tokenResponse = await fetch(tokenUrl.toString())
      const tokenData = await tokenResponse.json()

      if (tokenData.error) {
        return new Response(
          JSON.stringify({ error: 'Token exchange failed', details: tokenData.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Exchange for long-lived token
      const longLivedUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token')
      longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token')
      longLivedUrl.searchParams.set('client_id', integration.meta_app_id)
      longLivedUrl.searchParams.set('client_secret', integration.app_secret)
      longLivedUrl.searchParams.set('fb_exchange_token', tokenData.access_token)

      const longLivedResponse = await fetch(longLivedUrl.toString())
      const longLivedData = await longLivedResponse.json()

      const finalToken = longLivedData.access_token || tokenData.access_token

      // Update integration
      await supabase
        .from('meta_integrations')
        .update({
          access_token: finalToken,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', integration_id)

      // Auto-sync forms
      await supabase.functions.invoke('meta-forms-manager', {
        body: {
          action: 'sync_forms',
          integration_id
        }
      })

      return new Response(
        JSON.stringify({ success: true, integration_id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  } catch (error) {
    console.error('❌ OAuth callback error:', error)
    
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://mqotdnvwyjhyiqzbefpm.lovable.app'
    return Response.redirect(
      `${frontendUrl}/auth/meta/callback?error=internal_error`,
      302
    )
  }
})