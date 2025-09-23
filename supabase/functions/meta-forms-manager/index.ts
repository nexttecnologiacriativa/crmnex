import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MetaFormsRequest {
  action: 'sync_forms' | 'get_forms'
  integration_id: string
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

    const { action, integration_id } = await req.json() as MetaFormsRequest
    console.log(`Meta forms manager action: ${action} for integration: ${integration_id}`)

    // Get integration details
    const { data: integration, error: integrationError } = await supabase
      .from('meta_integrations')
      .select('*')
      .eq('id', integration_id)
      .single()

    if (integrationError || !integration) {
      console.error('Integration not found:', integrationError)
      return new Response(
        JSON.stringify({ error: 'Integration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'get_forms') {
      // Return existing forms from database
      const { data: forms, error } = await supabase
        .from('meta_lead_forms')
        .select('*')
        .eq('integration_id', integration_id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching forms:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch forms' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, forms }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'sync_forms') {
      try {
        // Get user's pages
        const pagesResponse = await fetch(
          `https://graph.facebook.com/v18.0/me/accounts?access_token=${integration.access_token}&fields=id,name,access_token`
        )

        if (!pagesResponse.ok) {
          throw new Error('Failed to fetch pages from Meta API')
        }

        const pagesData = await pagesResponse.json()
        const forms = []

        // For each page, get lead forms
        for (const page of pagesData.data || []) {
          const formsResponse = await fetch(
            `https://graph.facebook.com/v18.0/${page.id}/leadgen_forms?access_token=${page.access_token}&fields=id,name,status,leads_count,created_time`
          )

          if (formsResponse.ok) {
            const formsData = await formsResponse.json()
            
            for (const form of formsData.data || []) {
              if (form.status === 'ACTIVE') {
                // Get form fields
                const fieldsResponse = await fetch(
                  `https://graph.facebook.com/v18.0/${form.id}?access_token=${page.access_token}&fields=questions`
                )

                let fields = []
                if (fieldsResponse.ok) {
                  const fieldsData = await fieldsResponse.json()
                  fields = fieldsData.questions || []
                }

                // Upsert form in database
                const { error: upsertError } = await supabase
                  .from('meta_lead_forms')
                  .upsert({
                    integration_id: integration_id,
                    meta_form_id: form.id,
                    form_name: form.name,
                    page_id: page.id,
                    page_name: page.name,
                    fields_schema: fields,
                    is_active: true,
                    last_sync_at: new Date().toISOString()
                  }, {
                    onConflict: 'integration_id,meta_form_id'
                  })

                if (upsertError) {
                  console.error('Error upserting form:', upsertError)
                } else {
                  forms.push({
                    id: form.id,
                    name: form.name,
                    page_name: page.name,
                    leads_count: form.leads_count || 0,
                    fields_count: fields.length
                  })
                }
              }
            }
          }
        }

        console.log(`Synced ${forms.length} forms for integration ${integration_id}`)

        return new Response(
          JSON.stringify({ 
            success: true, 
            synced_forms: forms.length,
            forms 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } catch (error) {
        console.error('Error syncing forms:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to sync forms from Meta' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Meta forms manager error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})