import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MetaIntegration {
  id: string
  workspace_id: string
  name: string
  access_token: string
  selected_pipeline_id: string
  selected_tag_ids: string[]
  field_mapping: Record<string, string>
  is_active: boolean
}

interface MetaLeadForm {
  id: string
  integration_id: string
  meta_form_id: string
  form_name: string
  page_id: string
  selected_tag_ids: string[]
  field_mapping: Record<string, string>
}

interface SyncResult {
  integration_id: string
  integration_name: string
  leads_found: number
  leads_created: number
  leads_skipped: number
  errors: string[]
}

// Sync leads from the last N hours
const SYNC_HOURS = 2

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  console.log('🔄 Starting Meta leads auto-sync...')

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all active Meta integrations
    const { data: integrations, error: intError } = await supabase
      .from('meta_integrations')
      .select('*')
      .eq('is_active', true)

    if (intError) {
      console.error('❌ Error fetching integrations:', intError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch integrations', details: intError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!integrations || integrations.length === 0) {
      console.log('ℹ️ No active Meta integrations found')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active integrations to sync',
          results: []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📋 Found ${integrations.length} active integrations`)

    const results: SyncResult[] = []

    for (const integration of integrations as MetaIntegration[]) {
      console.log(`\n🔍 Processing integration: ${integration.name} (${integration.id})`)
      
      const result: SyncResult = {
        integration_id: integration.id,
        integration_name: integration.name,
        leads_found: 0,
        leads_created: 0,
        leads_skipped: 0,
        errors: []
      }

      try {
        // Get forms for this integration
        const { data: forms } = await supabase
          .from('meta_lead_forms')
          .select('*')
          .eq('integration_id', integration.id)
          .eq('is_active', true)

        if (!forms || forms.length === 0) {
          console.log(`⚠️ No active forms for integration ${integration.name}`)
          result.errors.push('No active forms configured')
          results.push(result)
          continue
        }

        console.log(`📝 Found ${forms.length} active forms`)

        // For each form, fetch recent leads from Meta
        for (const form of forms as MetaLeadForm[]) {
          console.log(`\n📋 Syncing form: ${form.form_name} (${form.meta_form_id})`)

          try {
            // Fetch leads from the last SYNC_HOURS hours
            const sinceTimestamp = Math.floor(Date.now() / 1000) - (SYNC_HOURS * 60 * 60)
            
            // Use only valid fields for leadgen endpoint
            // Note: ad_id, adgroup_id, campaign_id, platform are NOT available via form/leads query
            const leadsUrl = `https://graph.facebook.com/v24.0/${form.meta_form_id}/leads?` +
              `fields=id,created_time,field_data&` +
              `filtering=[{"field":"time_created","operator":"GREATER_THAN","value":${sinceTimestamp}}]&` +
              `access_token=${integration.access_token}`

            console.log(`📡 Fetching leads since ${new Date(sinceTimestamp * 1000).toISOString()}`)

            const leadsResponse = await fetch(leadsUrl)
            const leadsBody = await leadsResponse.text()

            if (!leadsResponse.ok) {
              let errorMsg = `HTTP ${leadsResponse.status}`
              try {
                const errorJson = JSON.parse(leadsBody)
                if (errorJson.error) {
                  errorMsg = `${errorJson.error.message} (code: ${errorJson.error.code})`
                  
                  // Log token expiration specifically
                  if (errorJson.error.code === 190) {
                    console.error(`🔑 Token expired or invalid for integration ${integration.name}`)
                    
                    // Update integration status to reflect token issue
                    await supabase
                      .from('meta_integrations')
                      .update({ 
                        is_active: false,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', integration.id)
                    
                    result.errors.push(`Token expired - integration deactivated. Please reauthenticate.`)
                  }
                }
              } catch { /* not JSON */ }
              
              console.error(`❌ Graph API error for form ${form.meta_form_id}:`, errorMsg)
              result.errors.push(`Form ${form.form_name}: ${errorMsg}`)
              continue
            }

            const leadsData = JSON.parse(leadsBody)
            const leads = leadsData.data || []
            
            result.leads_found += leads.length
            console.log(`📊 Found ${leads.length} leads in the last ${SYNC_HOURS} hours`)

            // Process each lead
            for (const lead of leads) {
              const leadgenId = lead.id

              // Check if this lead already exists
              const { data: existingLeads } = await supabase
                .from('leads')
                .select('id')
                .eq('workspace_id', integration.workspace_id)
                .contains('custom_fields', { meta_leadgen_id: leadgenId })
                .limit(1)

              if (existingLeads && existingLeads.length > 0) {
                console.log(`⏭️ Lead ${leadgenId} already exists, skipping`)
                result.leads_skipped++
                continue
              }

              // Also check webhook logs to avoid duplicates
              const { data: existingLog } = await supabase
                .from('meta_webhook_logs')
                .select('id')
                .eq('leadgen_id', leadgenId)
                .eq('status', 'success')
                .limit(1)

              if (existingLog && existingLog.length > 0) {
                console.log(`⏭️ Lead ${leadgenId} was already processed via webhook, skipping`)
                result.leads_skipped++
                continue
              }

              // Process this lead
              console.log(`🆕 Processing new lead: ${leadgenId}`)

              try {
                // Map lead data to CRM format
                const mappedData: Record<string, unknown> = {
                  workspace_id: integration.workspace_id,
                  pipeline_id: integration.selected_pipeline_id,
                  source: 'Meta Lead Ads (Auto-Sync)',
                  utm_source: 'facebook',
                  utm_medium: 'lead_ads',
                  utm_campaign: form.meta_form_id,
                  utm_content: form.page_id,
                  custom_fields: {
                    meta_leadgen_id: leadgenId,
                    meta_form_id: form.meta_form_id,
                    synced_at: new Date().toISOString()
                  }
                }

                // Merge field mappings
                const fieldMapping = { ...integration.field_mapping, ...form.field_mapping }

                if (lead.field_data) {
                  for (const field of lead.field_data) {
                    const metaFieldName = field.name.toLowerCase()
                    const crmField = fieldMapping[metaFieldName]

                    if (crmField && crmField !== '' && crmField !== '_ignore') {
                      if (crmField.startsWith('custom_fields.')) {
                        const customFieldName = crmField.replace('custom_fields.', '')
                        ;(mappedData.custom_fields as Record<string, string>)[customFieldName] = field.values?.[0] || ''
                      } else {
                        mappedData[crmField] = field.values?.[0] || ''
                      }
                    } else {
                      // Default mapping
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
                          ;(mappedData.custom_fields as Record<string, string>)[metaFieldName] = field.values?.[0] || ''
                      }
                    }
                  }
                }

                // Get first pipeline stage
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
                  mappedData.name = 'Lead from Meta (Auto-Sync)'
                }

                // Create lead
                const { data: newLead, error: leadError } = await supabase
                  .from('leads')
                  .insert(mappedData)
                  .select()
                  .single()

                if (leadError) {
                  console.error(`❌ Error creating lead ${leadgenId}:`, leadError)
                  result.errors.push(`Failed to create lead ${leadgenId}: ${leadError.message}`)
                  continue
                }

                // Apply tags
                const tagsToApply = form.selected_tag_ids?.length > 0 
                  ? form.selected_tag_ids 
                  : integration.selected_tag_ids || []

                if (tagsToApply.length > 0) {
                  const tagInserts = tagsToApply.map((tagId: string) => ({
                    lead_id: newLead.id,
                    tag_id: tagId
                  }))

                  await supabase
                    .from('lead_tag_relations')
                    .insert(tagInserts)
                }

                // Call lead distribution
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
                        source: 'Meta Lead Ads (Auto-Sync)',
                        tags: tagsToApply
                      })
                    }
                  )
                  const distResult = await distResponse.json()
                  console.log('📤 Distribution result:', distResult)
                } catch (distError) {
                  console.warn('⚠️ Distribution failed (non-blocking):', distError)
                }

                // Log successful sync
                await supabase
                  .from('meta_webhook_logs')
                  .insert({
                    integration_id: integration.id,
                    leadgen_id: leadgenId,
                    form_id: form.meta_form_id,
                    page_id: form.page_id,
                    event_type: 'auto_sync',
                    status: 'success',
                    lead_id: newLead.id,
                    processing_time_ms: 0
                  })

                result.leads_created++
                console.log(`✅ Created lead ${newLead.id} from leadgen ${leadgenId}`)

              } catch (err) {
                const errMsg = err instanceof Error ? err.message : 'Unknown error'
                console.error(`❌ Error processing lead ${leadgenId}:`, errMsg)
                result.errors.push(`Lead ${leadgenId}: ${errMsg}`)
              }
            }

          } catch (formErr) {
            const errMsg = formErr instanceof Error ? formErr.message : 'Unknown error'
            console.error(`❌ Error syncing form ${form.form_name}:`, errMsg)
            result.errors.push(`Form ${form.form_name}: ${errMsg}`)
          }
        }

      } catch (intErr) {
        const errMsg = intErr instanceof Error ? intErr.message : 'Unknown error'
        console.error(`❌ Error processing integration ${integration.name}:`, errMsg)
        result.errors.push(errMsg)
      }

      results.push(result)
    }

    const totalTime = Date.now() - startTime
    const totalCreated = results.reduce((sum, r) => sum + r.leads_created, 0)
    const totalFound = results.reduce((sum, r) => sum + r.leads_found, 0)
    const totalSkipped = results.reduce((sum, r) => sum + r.leads_skipped, 0)
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)

    console.log(`\n✅ Auto-sync completed in ${totalTime}ms`)
    console.log(`📊 Summary: ${totalFound} found, ${totalCreated} created, ${totalSkipped} skipped, ${totalErrors} errors`)

    // Save sync log
    await supabase
      .from('meta_sync_logs')
      .insert({
        sync_type: 'auto',
        leads_found: totalFound,
        leads_created: totalCreated,
        leads_skipped: totalSkipped,
        errors_count: totalErrors,
        processing_time_ms: totalTime,
        results: results
      })
      .catch(() => {
        // Table might not exist yet, that's OK
        console.log('⚠️ Could not save sync log (table may not exist)')
      })

    return new Response(
      JSON.stringify({
        success: true,
        processing_time_ms: totalTime,
        summary: {
          integrations_processed: results.length,
          leads_found: totalFound,
          leads_created: totalCreated,
          leads_skipped: totalSkipped,
          errors_count: totalErrors
        },
        results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Auto-sync error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'internal_error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
