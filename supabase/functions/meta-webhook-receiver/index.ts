import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// HMAC-SHA256 signature verification using Web Crypto API
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureData = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expectedSignature = 'sha256=' + Array.from(new Uint8Array(signatureData))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    console.log('Signature verification:', { 
      received: signature?.substring(0, 20) + '...', 
      expected: expectedSignature.substring(0, 20) + '...',
      match: signature === expectedSignature
    });
    
    return signature === expectedSignature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const integrationId = url.searchParams.get('integration_id')

    console.log('🔔 Meta webhook received:', { 
      method: req.method, 
      integrationId,
      url: req.url 
    });

    if (!integrationId) {
      console.error('❌ Missing integration_id');
      return new Response('Integration ID required', { status: 400, headers: corsHeaders })
    }

    // Get integration details
    const { data: integration, error: integrationError } = await supabase
      .from('meta_integrations')
      .select('*')
      .eq('id', integrationId)
      .single()

    if (integrationError || !integration) {
      console.error('❌ Integration not found:', integrationError)
      return new Response('Integration not found', { status: 404, headers: corsHeaders })
    }

    console.log('✅ Integration found:', { 
      name: integration.name, 
      isActive: integration.is_active 
    });

    // Handle verification challenge from Meta (GET request)
    if (req.method === 'GET') {
      const mode = url.searchParams.get('hub.mode')
      const token = url.searchParams.get('hub.verify_token')
      const challenge = url.searchParams.get('hub.challenge')

      console.log('🔐 Verification challenge:', { mode, token, challenge });

      if (mode === 'subscribe' && token === integration.webhook_verify_token) {
        console.log('✅ Webhook verified successfully for integration:', integrationId)
        return new Response(challenge, { headers: corsHeaders })
      }

      console.error('❌ Verification failed - token mismatch');
      return new Response('Verification failed', { status: 403, headers: corsHeaders })
    }

    // Handle webhook payload (POST request)
    if (req.method === 'POST') {
      const body = await req.text()
      const signature = req.headers.get('x-hub-signature-256')

      console.log('📦 Webhook payload received, size:', body.length, 'bytes');

      // Verify webhook signature (if provided)
      if (signature && integration.app_secret) {
        const isValid = await verifySignature(body, signature, integration.app_secret);
        
        if (!isValid) {
          console.error('❌ Invalid webhook signature');
          
          // Log the failed attempt
          await supabase.from('meta_webhook_logs').insert({
            integration_id: integrationId,
            event_type: 'signature_error',
            payload: { body_length: body.length },
            status: 'error',
            error_message: 'Invalid webhook signature',
            processing_time_ms: Date.now() - startTime
          });
          
          return new Response('Invalid signature', { status: 403, headers: corsHeaders })
        }
        
        console.log('✅ Signature verified');
      }

      let payload;
      try {
        payload = JSON.parse(body)
      } catch (parseError) {
        console.error('❌ Failed to parse JSON:', parseError);
        return new Response('Invalid JSON', { status: 400, headers: corsHeaders })
      }
      
      console.log('📋 Meta webhook payload:', JSON.stringify(payload, null, 2))

      // Process leadgen entries
      let leadsProcessed = 0;
      
      if (payload.entry) {
        for (const entry of payload.entry) {
          if (entry.changes) {
            for (const change of entry.changes) {
              if (change.field === 'leadgen') {
                const leadgenId = change.value.leadgen_id
                const formId = change.value.form_id
                const pageId = change.value.page_id

                console.log(`🎯 Processing lead: ${leadgenId} from form: ${formId}`)

                // Log the incoming webhook
                const { data: logEntry } = await supabase
                  .from('meta_webhook_logs')
                  .insert({
                    integration_id: integrationId,
                    event_type: 'leadgen',
                    payload: change.value,
                    status: 'processing',
                    leadgen_id: leadgenId,
                    form_id: formId,
                    page_id: pageId
                  })
                  .select()
                  .single();

                // Call meta-lead-processor to handle the lead
                const processorResponse = await supabase.functions.invoke('meta-lead-processor', {
                  body: {
                    integration_id: integrationId,
                    leadgen_id: leadgenId,
                    form_id: formId,
                    page_id: pageId,
                    log_id: logEntry?.id
                  }
                })

                if (processorResponse.error) {
                  console.error('❌ Error processing lead:', processorResponse.error)
                  
                  // Update log with error
                  if (logEntry?.id) {
                    await supabase
                      .from('meta_webhook_logs')
                      .update({
                        status: 'error',
                        error_message: processorResponse.error.message || 'Unknown error',
                        processing_time_ms: Date.now() - startTime
                      })
                      .eq('id', logEntry.id);
                  }
                } else {
                  console.log('✅ Lead processed successfully:', processorResponse.data);
                  leadsProcessed++;
                  
                  // Update log with success
                  if (logEntry?.id) {
                    await supabase
                      .from('meta_webhook_logs')
                      .update({
                        status: 'success',
                        lead_id: processorResponse.data?.lead_id,
                        processing_time_ms: Date.now() - startTime
                      })
                      .eq('id', logEntry.id);
                  }
                }
              }
            }
          }
        }
      }

      console.log(`✅ Webhook processed. Leads created: ${leadsProcessed}`);
      return new Response(JSON.stringify({ 
        success: true, 
        leads_processed: leadsProcessed 
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  } catch (error) {
    console.error('❌ Meta webhook error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})