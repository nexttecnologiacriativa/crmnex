import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 n8n webhook sender started');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { leadData, workspaceId } = await req.json();
    
    console.log('📥 Received data:', { leadData, workspaceId });

    if (!leadData || !workspaceId) {
      throw new Error('Missing leadData or workspaceId');
    }

    // Buscar configurações do workspace para obter a URL do n8n
    const { data: settings, error: settingsError } = await supabaseClient
      .from('workspace_settings')
      .select('n8n_webhook_url')
      .eq('workspace_id', workspaceId)
      .single();

    if (settingsError) {
      console.error('❌ Error fetching workspace settings:', settingsError);
      // Se não encontrou settings, não é um erro crítico - workspace pode não ter n8n configurado
      return new Response(
        JSON.stringify({ success: true, message: 'No n8n webhook configured' }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!settings?.n8n_webhook_url) {
      console.log('ℹ️ No n8n webhook URL configured for workspace:', workspaceId);
      return new Response(
        JSON.stringify({ success: true, message: 'No n8n webhook configured' }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('🎯 Sending to n8n webhook:', settings.n8n_webhook_url);

    // Enviar dados para o n8n
    const n8nResponse = await fetch(settings.n8n_webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...leadData,
        workspace_id: workspaceId,
        timestamp: new Date().toISOString(),
        source: 'leadflow_crm'
      }),
    });

    if (!n8nResponse.ok) {
      console.error('❌ Failed to send to n8n:', n8nResponse.status, n8nResponse.statusText);
      throw new Error(`n8n webhook returned ${n8nResponse.status}: ${n8nResponse.statusText}`);
    }

    console.log('✅ Successfully sent to n8n');

    return new Response(
      JSON.stringify({ success: true, message: 'Lead sent to n8n successfully' }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Error in n8n webhook sender:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});