import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.190.0/crypto/mod.ts'

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
    const integrationId = url.searchParams.get('integration_id')

    if (!integrationId) {
      return new Response('Integration ID required', { status: 400 })
    }

    // Get integration details
    const { data: integration, error: integrationError } = await supabase
      .from('meta_integrations')
      .select('*')
      .eq('id', integrationId)
      .single()

    if (integrationError || !integration) {
      console.error('Integration not found:', integrationError)
      return new Response('Integration not found', { status: 404 })
    }

    // Handle verification challenge from Meta
    if (req.method === 'GET') {
      const mode = url.searchParams.get('hub.mode')
      const token = url.searchParams.get('hub.verify_token')
      const challenge = url.searchParams.get('hub.challenge')

      if (mode === 'subscribe' && token === integration.webhook_verify_token) {
        console.log('Webhook verified for integration:', integrationId)
        return new Response(challenge)
      }

      return new Response('Verification failed', { status: 403 })
    }

    // Handle webhook payload
    if (req.method === 'POST') {
      const body = await req.text()
      const signature = req.headers.get('x-hub-signature-256')

      // Verify webhook signature
      if (signature) {
        const expectedSignature = 'sha256=' + new TextEncoder().encode(integration.app_secret + body).reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '')

        if (signature !== expectedSignature) {
          console.error('Invalid webhook signature')
          return new Response('Invalid signature', { status: 403 })
        }
      }

      const payload = JSON.parse(body)
      console.log('Meta webhook payload:', JSON.stringify(payload, null, 2))

      // Process leadgen entries
      if (payload.entry) {
        for (const entry of payload.entry) {
          if (entry.changes) {
            for (const change of entry.changes) {
              if (change.field === 'leadgen') {
                const leadgenId = change.value.leadgen_id
                const formId = change.value.form_id
                const pageId = change.value.page_id

                console.log(`Processing lead: ${leadgenId} from form: ${formId}`)

                // Call meta-lead-processor to handle the lead
                const processorResponse = await supabase.functions.invoke('meta-lead-processor', {
                  body: {
                    integration_id: integrationId,
                    leadgen_id: leadgenId,
                    form_id: formId,
                    page_id: pageId
                  }
                })

                if (processorResponse.error) {
                  console.error('Error processing lead:', processorResponse.error)
                }
              }
            }
          }
        }
      }

      return new Response('OK', { status: 200 })
    }

    return new Response('Method not allowed', { status: 405 })

  } catch (error) {
    console.error('Meta webhook error:', error)
    return new Response('Internal server error', { status: 500 })
  }
})