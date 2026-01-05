import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FetchLeadsRequest {
  integration_id: string
  days_back?: number
}

interface MetaLead {
  id: string
  created_time: string
  field_data: Array<{
    name: string
    values: string[]
  }>
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

    const { integration_id, days_back = 7 } = await req.json() as FetchLeadsRequest

    if (!integration_id) {
      return new Response(
        JSON.stringify({ error: 'missing_integration_id', message: 'integration_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔍 Starting manual lead fetch for integration ${integration_id} (last ${days_back} days)`)

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
      return new Response(
        JSON.stringify({ error: 'integration_inactive', message: 'Integration is not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get active forms for this integration
    const { data: forms, error: formsError } = await supabase
      .from('meta_lead_forms')
      .select('*')
      .eq('integration_id', integration_id)
      .eq('is_active', true)

    if (formsError) {
      console.error('❌ Error fetching forms:', formsError)
      return new Response(
        JSON.stringify({ error: 'forms_fetch_error', message: formsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!forms || forms.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'no_forms', 
          message: 'No active forms found. Sync forms first.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📋 Found ${forms.length} active forms`)

    // Get pipeline info for stage mapping
    const { data: pipeline } = await supabase
      .from('pipelines')
      .select('id, pipeline_stages!inner(*)')
      .eq('id', integration.selected_pipeline_id)
      .single()

    let defaultStageId: string | null = null
    if (pipeline?.pipeline_stages?.length > 0) {
      const stages = pipeline.pipeline_stages as Array<{ id: string; position: number }>
      const firstStage = stages.sort((a, b) => a.position - b.position)[0]
      defaultStageId = firstStage.id
    }

    const summary = {
      forms_checked: forms.length,
      leads_found_in_meta: 0,
      leads_already_in_crm: 0,
      leads_created: 0,
      errors: [] as string[]
    }

    const createdLeads: Array<{ id: string; name: string; leadgen_id: string }> = []

    // Process each form
    for (const form of forms) {
      console.log(`\n🔎 Checking form: ${form.form_name} (${form.meta_form_id})`)

      try {
        // Fetch leads from Meta API
        const leadsUrl = `https://graph.facebook.com/v18.0/${form.meta_form_id}/leads?` +
          `fields=id,created_time,field_data&` +
          `access_token=${integration.access_token}`

        const response = await fetch(leadsUrl)
        const responseBody = await response.text()

        if (!response.ok) {
          console.error(`❌ Failed to fetch leads for form ${form.form_name}:`, responseBody)
          summary.errors.push(`Form ${form.form_name}: ${responseBody.substring(0, 100)}`)
          continue
        }

        const leadData = JSON.parse(responseBody)
        const leads = leadData.data as MetaLead[] || []

        console.log(`📊 Found ${leads.length} leads in Meta for this form`)
        summary.leads_found_in_meta += leads.length

        // Filter leads by date
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - days_back)
        
        const recentLeads = leads.filter(lead => {
          const leadDate = new Date(lead.created_time)
          return leadDate >= cutoffDate
        })

        console.log(`📅 ${recentLeads.length} leads within last ${days_back} days`)

        // Check which leads already exist
        for (const lead of recentLeads) {
          // Check if lead already exists by searching for meta_leadgen_id in custom_fields
          const { data: existingLeads } = await supabase
            .from('leads')
            .select('id, custom_fields')
            .eq('workspace_id', integration.workspace_id)
            .ilike('source', '%Meta%')

          const leadExists = existingLeads?.some(existingLead => {
            const customFields = existingLead.custom_fields as Record<string, unknown> | null
            return customFields?.meta_leadgen_id === lead.id
          })

          if (leadExists) {
            console.log(`⏭️ Lead ${lead.id} already exists, skipping`)
            summary.leads_already_in_crm++
            continue
          }

          // Create the lead
          console.log(`✨ Creating new lead from Meta: ${lead.id}`)

          // Map lead data
          const mappedData: Record<string, unknown> = {
            workspace_id: integration.workspace_id,
            pipeline_id: integration.selected_pipeline_id,
            stage_id: defaultStageId,
            source: 'Meta Lead Ads (Manual Fetch)',
            utm_source: 'facebook',
            utm_medium: 'lead_ads',
            utm_campaign: form.meta_form_id,
            utm_content: form.page_id,
            custom_fields: {
              meta_leadgen_id: lead.id,
              meta_form_id: form.meta_form_id,
              meta_form_name: form.form_name
            }
          }

          // Merge field mappings
          const integrationMapping = integration.field_mapping || {}
          const formMapping = form.field_mapping || {}
          const fieldMapping = { ...integrationMapping, ...formMapping }

          // Map field data
          for (const field of lead.field_data) {
            const metaFieldName = field.name.toLowerCase()
            const crmField = fieldMapping[metaFieldName]

            if (crmField && crmField !== '' && crmField !== '_ignore') {
              if (crmField.startsWith('custom_fields.')) {
                const customFieldName = crmField.replace('custom_fields.', '')
                if (!mappedData.custom_fields) {
                  mappedData.custom_fields = { meta_leadgen_id: lead.id }
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
                  if (!mappedData.custom_fields) {
                    mappedData.custom_fields = { meta_leadgen_id: lead.id }
                  }
                  (mappedData.custom_fields as Record<string, string>)[metaFieldName] = field.values?.[0] || ''
              }
            }
          }

          // Ensure required fields
          if (!mappedData.name && !mappedData.email) {
            mappedData.name = 'Lead from Meta'
          }

          // Create lead
          const { data: newLead, error: leadError } = await supabase
            .from('leads')
            .insert(mappedData)
            .select()
            .single()

          if (leadError) {
            console.error(`❌ Failed to create lead ${lead.id}:`, leadError)
            summary.errors.push(`Lead ${lead.id}: ${leadError.message}`)
            continue
          }

          // Apply tags
          const formTagIds = form.selected_tag_ids || []
          const tagsToApply = formTagIds.length > 0 ? formTagIds : (integration.selected_tag_ids || [])

          if (tagsToApply.length > 0) {
            const tagInserts = tagsToApply.map((tagId: string) => ({
              lead_id: newLead.id,
              tag_id: tagId
            }))

            await supabase.from('lead_tag_relations').insert(tagInserts)
          }

          summary.leads_created++
          createdLeads.push({
            id: newLead.id,
            name: (newLead.name as string) || 'Lead',
            leadgen_id: lead.id
          })

          console.log(`✅ Created lead: ${newLead.id}`)
        }

      } catch (formError) {
        console.error(`❌ Error processing form ${form.form_name}:`, formError)
        summary.errors.push(`Form ${form.form_name}: ${formError instanceof Error ? formError.message : 'Unknown error'}`)
      }
    }

    const processingTime = Date.now() - startTime

    console.log(`\n📊 Summary:`)
    console.log(`   Forms checked: ${summary.forms_checked}`)
    console.log(`   Leads found in Meta: ${summary.leads_found_in_meta}`)
    console.log(`   Already in CRM: ${summary.leads_already_in_crm}`)
    console.log(`   Created: ${summary.leads_created}`)
    console.log(`   Errors: ${summary.errors.length}`)
    console.log(`   Processing time: ${processingTime}ms`)

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        created_leads: createdLeads,
        processing_time_ms: processingTime
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Meta fetch leads error:', error)
    return new Response(
      JSON.stringify({
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
