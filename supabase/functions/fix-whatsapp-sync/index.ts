import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { workspaceId, instanceName } = await req.json()

    console.log(`🔧 Fixing sync for instance ${instanceName} in workspace ${workspaceId}`)

    // Get Evolution config for the workspace
    const { data: config } = await supabaseClient
      .from('whatsapp_evolution_configs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single()

    if (!config) {
      throw new Error('Evolution API config not found')
    }

    // Fetch instance from Evolution API
    const evolutionResponse = await fetch(`${config.api_url}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': config.global_api_key
      }
    })

    if (!evolutionResponse.ok) {
      throw new Error(`Evolution API error: ${evolutionResponse.status}`)
    }

    const evolutionInstances = await evolutionResponse.json()
    console.log(`📋 Found ${evolutionInstances.length} instances in Evolution API`)

    // Find the specific instance
    const evolutionInstance = evolutionInstances.find((inst: any) => 
      inst.name === instanceName || 
      inst.instanceName === instanceName
    )

    if (!evolutionInstance) {
      throw new Error(`Instance ${instanceName} not found in Evolution API`)
    }

    console.log(`📱 Found instance in Evolution API:`, {
      name: evolutionInstance.name,
      status: evolutionInstance.connectionStatus,
      ownerJid: evolutionInstance.ownerJid
    })

    // Update the local instance
    const updateData = {
      status: evolutionInstance.connectionStatus || 'connecting',
      phone_number: evolutionInstance.ownerJid ? evolutionInstance.ownerJid.split('@')[0] : null,
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { error: updateError } = await supabaseClient
      .from('whatsapp_instances')
      .update(updateData)
      .eq('instance_name', instanceName)
      .eq('workspace_id', workspaceId)

    if (updateError) {
      throw updateError
    }

    console.log(`✅ Successfully updated instance ${instanceName}`)

    return new Response(JSON.stringify({ 
      success: true, 
      instanceName,
      updatedStatus: evolutionInstance.connectionStatus,
      phoneNumber: evolutionInstance.ownerJid?.split('@')[0]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Error fixing WhatsApp sync:', error)
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})