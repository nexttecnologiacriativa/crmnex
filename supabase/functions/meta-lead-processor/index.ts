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
  log_id?: string
}

interface GraphAPIError {
  message: string
  type: string
  code: number
  error_subcode?: number
  fbtrace_id?: string
}

// Detect if this is a Meta webhook test (fake IDs)
function isTestLeadgenId(leadgenId: string): boolean {
  // Meta webhook test uses placeholder IDs like "444444444444444" or patterns like all same digits
  if (/^(\d)\1{10,}$/.test(leadgenId)) {
    return true
  }
  // Also check for known test patterns
  if (leadgenId.startsWith('0') || leadgenId === 'test' || leadgenId.length < 10) {
    return true
  }
  return false
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now()

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { integration_id, leadgen_id, form_id, page_id, log_id } = await req.json() as MetaLeadRequest
    console.log(`🎯 Processing lead ${leadgen_id} for integration ${integration_id}`)

    // Check if this is a test webhook with fake IDs
    if (isTestLeadgenId(leadgen_id)) {
      console.log(`⚠️ Detected Meta webhook test with fake leadgen_id: ${leadgen_id}`)
      
      const testMessage = `Este é um evento de TESTE do console de Webhooks do Meta. ` +
        `O leadgen_id "${leadgen_id}" é fictício e não existe no Graph API. ` +
        `Para testar a integração completa, use a "Lead Ads Testing Tool" do Meta ` +
        `ou envie um lead real pelo formulário.`
      
      // Return 200 OK with is_test flag to avoid webhook receiver marking as error
      return new Response(
        JSON.stringify({ 
          success: true,
          is_test: true,
          message: testMessage,
          leadgen_id: leadgen_id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get integration details
    const { data: integration, error: integrationError } = await supabase
      .from('meta_integrations')
      .select('*')
      .eq('id', integration_id)
      .single()

    if (integrationError || !integration) {
      console.error('❌ Integration not found:', integrationError)
      return new Response(
        JSON.stringify({ error: 'integration_not_found', message: 'Integration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!integration.is_active) {
      console.log('⚠️ Integration is not active, skipping lead processing')
      return new Response(
        JSON.stringify({ error: 'integration_inactive', message: 'Integration is not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch lead data from Meta API with specific fields
    const graphApiUrl = `https://graph.facebook.com/v18.0/${leadgen_id}?` + 
      `fields=created_time,field_data,form_id,ad_id,adgroup_id,campaign_id,platform&` +
      `access_token=${integration.access_token}`
    
    console.log(`📡 Fetching lead from Graph API: ${leadgen_id}`)
    
    const leadResponse = await fetch(graphApiUrl)
    const leadResponseBody = await leadResponse.text()

    if (!leadResponse.ok) {
      let errorDetail: GraphAPIError | null = null
      try {
        const errorJson = JSON.parse(leadResponseBody)
        errorDetail = errorJson.error as GraphAPIError
      } catch {
        // Response wasn't JSON
      }

      const errorMessage = errorDetail 
        ? `Graph API Error: ${errorDetail.message} (code: ${errorDetail.code}, subcode: ${errorDetail.error_subcode || 'N/A'}, trace: ${errorDetail.fbtrace_id || 'N/A'})`
        : `Graph API Error: HTTP ${leadResponse.status} - ${leadResponseBody.substring(0, 200)}`

      console.error(`❌ Failed to fetch lead from Graph API:`, errorMessage)

      // Determine appropriate status code
      let statusCode = 500
      if (leadResponse.status === 400) statusCode = 400
      else if (leadResponse.status === 401 || leadResponse.status === 403) statusCode = 401
      else if (leadResponse.status === 404) statusCode = 404

      return new Response(
        JSON.stringify({ 
          error: 'graph_api_error',
          message: errorMessage,
          graph_status: leadResponse.status,
          graph_error: errorDetail,
          leadgen_id: leadgen_id
        }),
        { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let leadData
    try {
      leadData = JSON.parse(leadResponseBody)
    } catch {
      console.error('❌ Failed to parse Graph API response:', leadResponseBody.substring(0, 200))
      return new Response(
        JSON.stringify({ error: 'parse_error', message: 'Failed to parse Graph API response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Lead data from Meta:', JSON.stringify(leadData, null, 2))

    // Get form details (with tags and field mapping)
    const { data: existingForm } = await supabase
      .from('meta_lead_forms')
      .select('*, selected_tag_ids, field_mapping')
      .eq('integration_id', integration_id)
      .eq('meta_form_id', form_id)
      .single()

    if (!existingForm) {
      // Try to fetch form details from Meta API
      let formName = `Formulário ${form_id}`
      let pageName = 'Página Desconhecida'
      
      try {
        const formResponse = await fetch(
          `https://graph.facebook.com/v18.0/${form_id}?fields=name,page_id&access_token=${integration.access_token}`
        )

        if (formResponse.ok) {
          const formData = await formResponse.json()
          formName = formData.name || formName
          
          // Get page name
          const pageResponse = await fetch(
            `https://graph.facebook.com/v18.0/${page_id}?fields=name&access_token=${integration.access_token}`
          )
          
          if (pageResponse.ok) {
            const pageData = await pageResponse.json()
            pageName = pageData.name || pageName
          }
        }
      } catch (e) {
        console.warn('⚠️ Could not fetch form/page details from Meta API, using defaults')
      }

      // Always create the form record (even if API fetch failed)
      const { error: insertError } = await supabase
        .from('meta_lead_forms')
        .insert({
          integration_id: integration_id,
          meta_form_id: form_id,
          form_name: formName,
          page_id: page_id,
          page_name: pageName,
          fields_schema: leadData.field_data || [],
          selected_tag_ids: [],
          field_mapping: {}
        })
      
      if (insertError) {
        console.warn('⚠️ Error inserting form:', insertError)
      } else {
        console.log('✅ Form registered:', formName)
      }
    }

    // Map Meta lead data to CRM lead format
    const mappedData: Record<string, unknown> = {
      workspace_id: integration.workspace_id,
      pipeline_id: integration.selected_pipeline_id,
      source: 'Meta Lead Ads',
      utm_source: 'facebook',
      utm_medium: 'lead_ads',
      utm_campaign: form_id,
      utm_content: page_id,
      custom_fields: {
        meta_leadgen_id: leadgen_id,
        meta_form_id: form_id
      }
    }

    // Merge field mappings: form-specific overrides integration-level
    const integrationMapping = integration.field_mapping || {}
    const formMapping = existingForm?.field_mapping || {}
    const fieldMapping = { ...integrationMapping, ...formMapping }
    
    console.log('📋 Field mapping:', JSON.stringify(fieldMapping, null, 2))
    
    if (leadData.field_data) {
      for (const field of leadData.field_data) {
        const metaFieldName = field.name.toLowerCase()
        const crmField = fieldMapping[metaFieldName]

        if (crmField && crmField !== '') {
          // Skip if set to ignore
          if (crmField === '_ignore') continue
          
          // Handle custom fields
          if (crmField.startsWith('custom_fields.')) {
            const customFieldName = crmField.replace('custom_fields.', '')
            if (!mappedData.custom_fields) {
              mappedData.custom_fields = {}
            }
            (mappedData.custom_fields as Record<string, string>)[customFieldName] = field.values?.[0] || ''
          } else {
            mappedData[crmField] = field.values?.[0] || ''
          }
        } else {
          // Default mapping for common fields
          switch (metaFieldName) {
            case 'full_name':
            case 'name':
              if (!mappedData.name) mappedData.name = field.values?.[0] || ''
              break
            case 'email':
              if (!mappedData.email) mappedData.email = field.values?.[0] || ''
              break
            case 'phone_number':
            case 'phone':
              if (!mappedData.phone) mappedData.phone = field.values?.[0] || ''
              break
            case 'company_name':
            case 'company':
              if (!mappedData.company) mappedData.company = field.values?.[0] || ''
              break
            default:
              // Store unmapped fields in custom_fields
              if (!mappedData.custom_fields) {
                mappedData.custom_fields = {}
              }
              (mappedData.custom_fields as Record<string, string>)[metaFieldName] = field.values?.[0] || ''
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
      const stages = pipeline.pipeline_stages as Array<{ id: string; position: number }>
      const firstStage = stages.sort((a, b) => a.position - b.position)[0]
      mappedData.stage_id = firstStage.id
    }

    // Ensure required fields
    if (!mappedData.name && !mappedData.email) {
      mappedData.name = 'Lead from Meta'
    }

    console.log('📝 Mapped lead data:', JSON.stringify(mappedData, null, 2))

    // Create lead in CRM
    const { data: newLead, error: leadError } = await supabase
      .from('leads')
      .insert(mappedData)
      .select()
      .single()

    if (leadError) {
      console.error('❌ Error creating lead:', leadError)
      return new Response(
        JSON.stringify({ 
          error: 'lead_creation_failed', 
          message: leadError.message,
          details: leadError.details
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine which tags to apply: form-specific or integration-level
    const formTagIds = existingForm?.selected_tag_ids || []
    const tagsToApply = (formTagIds.length > 0) ? formTagIds : (integration.selected_tag_ids || [])
    
    console.log('🏷️ Tags to apply:', tagsToApply, '(form-specific:', formTagIds.length > 0, ')')

    // Apply tags if configured
    if (tagsToApply.length > 0) {
      const tagInserts = tagsToApply.map((tagId: string) => ({
        lead_id: newLead.id,
        tag_id: tagId
      }))

      const { error: tagError } = await supabase
        .from('lead_tag_relations')
        .insert(tagInserts)
      
      if (tagError) {
        console.warn('⚠️ Error applying tags:', tagError)
      } else {
        console.log(`✅ Applied ${tagInserts.length} tags to lead`)
      }
    }

    // Call lead distribution
    console.log('📤 Calling lead distribution...')
    try {
      const distResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/distribute-lead`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({
            lead_id: newLead.id,
            workspace_id: integration.workspace_id,
            pipeline_id: integration.selected_pipeline_id,
            source: 'Meta Lead Ads',
            tags: tagsToApply
          })
        }
      )
      const distResult = await distResponse.json()
      console.log('📤 Distribution result:', distResult)
    } catch (distError) {
      console.warn('⚠️ Distribution failed (non-blocking):', distError)
    }

    const processingTime = Date.now() - startTime
    console.log(`✅ Lead created successfully: ${newLead.id} (${processingTime}ms)`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        lead_id: newLead.id,
        leadgen_id: leadgen_id,
        processing_time_ms: processingTime
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Meta lead processor error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'internal_error', 
        message: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
