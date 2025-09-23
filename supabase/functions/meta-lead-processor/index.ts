import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MetaLeadRequest {
  integration_id: string
  leadgen_id: string
  form_id: string
  page_id: string
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

    const { integration_id, leadgen_id, form_id, page_id } = await req.json() as MetaLeadRequest
    console.log(`Processing lead ${leadgen_id} for integration ${integration_id}`)

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

    if (!integration.is_active) {
      console.log('Integration is not active, skipping lead processing')
      return new Response(
        JSON.stringify({ error: 'Integration is not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch lead data from Meta API
    const leadResponse = await fetch(
      `https://graph.facebook.com/v18.0/${leadgen_id}?access_token=${integration.access_token}`
    )

    if (!leadResponse.ok) {
      console.error('Failed to fetch lead from Meta API:', leadResponse.statusText)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch lead data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const leadData = await leadResponse.json()
    console.log('Lead data from Meta:', JSON.stringify(leadData, null, 2))

    // Get form details if not exists
    const { data: existingForm } = await supabase
      .from('meta_lead_forms')
      .select('*')
      .eq('integration_id', integration_id)
      .eq('meta_form_id', form_id)
      .single()

    if (!existingForm) {
      // Fetch form details from Meta API
      const formResponse = await fetch(
        `https://graph.facebook.com/v18.0/${form_id}?fields=name,page_id&access_token=${integration.access_token}`
      )

      if (formResponse.ok) {
        const formData = await formResponse.json()
        
        // Get page name
        const pageResponse = await fetch(
          `https://graph.facebook.com/v18.0/${page_id}?fields=name&access_token=${integration.access_token}`
        )
        
        const pageData = pageResponse.ok ? await pageResponse.json() : { name: 'Unknown Page' }

        await supabase
          .from('meta_lead_forms')
          .insert({
            integration_id: integration_id,
            meta_form_id: form_id,
            form_name: formData.name || 'Unknown Form',
            page_id: page_id,
            page_name: pageData.name || 'Unknown Page',
            fields_schema: leadData.field_data || []
          })
      }
    }

    // Map Meta lead data to CRM lead format
    const mappedData: any = {
      workspace_id: integration.workspace_id,
      pipeline_id: integration.selected_pipeline_id,
      source: 'Meta Lead Ads',
      utm_source: 'facebook',
      utm_medium: 'lead_ads',
      utm_campaign: form_id,
      utm_content: page_id
    }

    // Apply field mapping
    const fieldMapping = integration.field_mapping || {}
    
    if (leadData.field_data) {
      for (const field of leadData.field_data) {
        const metaFieldName = field.name.toLowerCase()
        const crmField = fieldMapping[metaFieldName]

        if (crmField) {
          mappedData[crmField] = field.values?.[0] || ''
        } else {
          // Default mapping for common fields
          switch (metaFieldName) {
            case 'full_name':
            case 'name':
              mappedData.name = field.values?.[0] || ''
              break
            case 'email':
              mappedData.email = field.values?.[0] || ''
              break
            case 'phone_number':
            case 'phone':
              mappedData.phone = field.values?.[0] || ''
              break
            case 'company_name':
            case 'company':
              mappedData.company = field.values?.[0] || ''
              break
            default:
              // Store unmapped fields in custom_fields
              if (!mappedData.custom_fields) {
                mappedData.custom_fields = {}
              }
              mappedData.custom_fields[metaFieldName] = field.values?.[0] || ''
          }
        }
      }
    }

    // Get default pipeline stage
    const { data: pipeline } = await supabase
      .from('pipelines')
      .select('id, pipeline_stages!inner(*)')
      .eq('id', integration.selected_pipeline_id)
      .single()

    if (pipeline?.pipeline_stages?.length > 0) {
      const firstStage = pipeline.pipeline_stages.sort((a, b) => a.position - b.position)[0]
      mappedData.stage_id = firstStage.id
    }

    // Ensure required fields
    if (!mappedData.name && !mappedData.email) {
      mappedData.name = 'Lead from Meta'
    }

    console.log('Mapped lead data:', JSON.stringify(mappedData, null, 2))

    // Create lead in CRM
    const { data: newLead, error: leadError } = await supabase
      .from('leads')
      .insert(mappedData)
      .select()
      .single()

    if (leadError) {
      console.error('Error creating lead:', leadError)
      return new Response(
        JSON.stringify({ error: 'Failed to create lead' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Apply tags if configured
    if (integration.selected_tag_ids && integration.selected_tag_ids.length > 0) {
      const tagInserts = integration.selected_tag_ids.map(tagId => ({
        lead_id: newLead.id,
        tag_id: tagId
      }))

      await supabase
        .from('lead_tag_relations')
        .insert(tagInserts)
    }

    console.log(`Lead created successfully: ${newLead.id}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        lead_id: newLead.id,
        leadgen_id: leadgen_id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Meta lead processor error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})