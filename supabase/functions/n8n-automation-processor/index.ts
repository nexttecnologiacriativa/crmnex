import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Função para processar telefone com DDI padrão 55
function processPhone(phone: string): string {
  console.log('📞 Processing phone - Original:', phone);
  
  if (!phone || phone.trim() === '') {
    console.log('📞 Phone is empty, returning as is');
    return phone;
  }
  
  // Remove todos os caracteres não numéricos
  const cleanPhone = phone.replace(/\D/g, '');
  console.log('📞 Clean phone:', cleanPhone, 'Length:', cleanPhone.length);
  
  // Se já tem DDI (11+ dígitos), retorna como está
  if (cleanPhone.length >= 11) {
    console.log('📞 Phone already has DDI, returning as is:', cleanPhone);
    return cleanPhone;
  }
  
  // Se tem 10 dígitos, adiciona DDI 55
  if (cleanPhone.length === 10) {
    const processedPhone = '55' + cleanPhone;
    console.log('📞 Adding DDI 55 to phone:', processedPhone);
    return processedPhone;
  }
  
  // Se tem 8 ou 9 dígitos, assume que falta DDD e adiciona DDI 55 + DDD padrão 11
  if (cleanPhone.length === 8 || cleanPhone.length === 9) {
    const processedPhone = '5511' + cleanPhone;
    console.log('📞 Adding DDI 55 + DDD 11 to phone:', processedPhone);
    return processedPhone;
  }
  
  // Para outros casos, retorna como está
  console.log('📞 Unknown phone format, returning as is:', cleanPhone);  
  return cleanPhone;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 N8n automation processor started');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar items pendentes na fila de automação para n8n
    const { data: queueItems, error: queueError } = await supabaseClient
      .from('automation_queue')
      .select('*')
      .eq('trigger_type', 'n8n_lead_notification')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    if (queueError) {
      console.error('❌ Error fetching queue items:', queueError);
      throw queueError;
    }

    if (!queueItems || queueItems.length === 0) {
      console.log('ℹ️ No pending n8n notifications in queue');
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`📋 Processing ${queueItems.length} n8n notifications`);

    for (const item of queueItems) {
      try {
        // Marcar como processando
        await supabaseClient
          .from('automation_queue')
          .update({ status: 'processing' })
          .eq('id', item.id);

        const leadId = item.trigger_data.lead_id;
        const workspaceId = item.workspace_id;
        const pipelineId = item.trigger_data.pipeline_id;

        // Buscar webhooks n8n ativos
        const { data: webhooks, error: webhooksError } = await supabaseClient
          .from('n8n_webhooks')
          .select('webhook_url, name')
          .eq('workspace_id', workspaceId)
          .eq('pipeline_id', pipelineId)
          .eq('is_active', true);

        if (webhooksError) {
          console.error('❌ Error fetching n8n webhooks:', webhooksError);
          throw webhooksError;
        }

        if (!webhooks || webhooks.length === 0) {
          console.log(`ℹ️ No n8n webhooks for workspace ${workspaceId}, pipeline ${pipelineId}`);
          
          // Marcar como processado
          await supabaseClient
            .from('automation_queue')
            .update({ 
              status: 'completed',
              processed_at: new Date().toISOString()
            })
            .eq('id', item.id);
          
          continue;
        }

        // Buscar dados do lead
        const { data: lead, error: leadError } = await supabaseClient
          .from('leads')
          .select(`
            *,
            pipelines:pipeline_id(name),
            pipeline_stages:stage_id(name)
          `)
          .eq('id', leadId)
          .single();

        if (leadError) {
          console.error('❌ Error fetching lead:', leadError);
          throw leadError;
        }

        // Preparar dados para n8n
        const leadDataForN8n = {
          id: lead.id,
          name: lead.name,
          email: lead.email,
          phone: processPhone(lead.phone || ''),
          company: lead.company,
          value: lead.value,
          source: lead.source,
          utm_source: lead.utm_source,
          utm_medium: lead.utm_medium,
          utm_campaign: lead.utm_campaign,
          utm_term: lead.utm_term,
          utm_content: lead.utm_content,
          custom_fields: lead.custom_fields,
          pipeline: lead.pipelines?.name,
          stage: lead.pipeline_stages?.name,
          created_at: lead.created_at,
          currency: lead.currency,
          notes: lead.notes,
          status: lead.status,
          workspace_id: workspaceId,
          timestamp: new Date().toISOString(),
          source_system: 'leadflow_crm'
        };

        // Enviar para cada webhook n8n
        let allSuccessful = true;
        const errors = [];

        for (const webhook of webhooks) {
          try {
            console.log(`📤 Sending to n8n webhook: ${webhook.name}`);
            
            const response = await fetch(webhook.webhook_url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(leadDataForN8n)
            });

            if (!response.ok) {
              console.error(`❌ N8n webhook ${webhook.name} failed:`, response.status, response.statusText);
              allSuccessful = false;
              errors.push(`${webhook.name}: ${response.status}`);
            } else {
              console.log(`✅ Successfully sent to n8n webhook: ${webhook.name}`);
            }
          } catch (error) {
            console.error(`❌ Error sending to n8n webhook ${webhook.name}:`, error);
            allSuccessful = false;
            errors.push(`${webhook.name}: ${error.message}`);
          }
        }

        // Atualizar status na fila
        await supabaseClient
          .from('automation_queue')
          .update({ 
            status: allSuccessful ? 'completed' : 'failed',
            processed_at: new Date().toISOString(),
            error_message: errors.length > 0 ? errors.join(', ') : null
          })
          .eq('id', item.id);

      } catch (error) {
        console.error(`❌ Error processing queue item ${item.id}:`, error);
        
        // Marcar como falhou
        await supabaseClient
          .from('automation_queue')
          .update({ 
            status: 'failed',
            processed_at: new Date().toISOString(),
            error_message: error.message
          })
          .eq('id', item.id);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: queueItems.length }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Error in n8n automation processor:', error);
    
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