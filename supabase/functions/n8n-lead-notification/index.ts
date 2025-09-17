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

interface LeadData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  value?: number;
  source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  custom_fields?: Record<string, any>;
  pipeline_id: string;
  stage_id: string;
  workspace_id: string;
  created_at: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 N8n lead notification started');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { record }: { record: LeadData } = await req.json();
    
    console.log('📥 New lead for n8n:', record.id, record.name);

    // Buscar n8n webhooks ativos para este workspace e pipeline
    const { data: webhooks, error: webhooksError } = await supabaseClient
      .from('n8n_webhooks')
      .select('webhook_url, name')
      .eq('workspace_id', record.workspace_id)
      .eq('pipeline_id', record.pipeline_id)
      .eq('is_active', true);

    if (webhooksError) {
      console.error('❌ Error fetching n8n webhooks:', webhooksError);
      throw webhooksError;
    }

    if (!webhooks || webhooks.length === 0) {
      console.log('ℹ️ No active n8n webhooks found for this workspace/pipeline');
      return new Response(
        JSON.stringify({ success: true, message: 'No webhooks configured' }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Buscar dados adicionais do lead
    const { data: leadWithRelations, error: leadError } = await supabaseClient
      .from('leads')
      .select(`
        *,
        pipelines:pipeline_id(name),
        pipeline_stages:stage_id(name)
      `)
      .eq('id', record.id)
      .single();

    if (leadError) {
      console.error('❌ Error fetching lead details:', leadError);
      throw leadError;
    }

    // Preparar dados para envio
    const leadDataForN8n = {
      id: leadWithRelations.id,
      name: leadWithRelations.name,
      email: leadWithRelations.email,
      phone: processPhone(leadWithRelations.phone || ''),
      company: leadWithRelations.company,
      value: leadWithRelations.value,
      source: leadWithRelations.source,
      utm_source: leadWithRelations.utm_source,
      utm_medium: leadWithRelations.utm_medium,
      utm_campaign: leadWithRelations.utm_campaign,
      utm_term: leadWithRelations.utm_term,
      utm_content: leadWithRelations.utm_content,
      custom_fields: leadWithRelations.custom_fields,
      pipeline: leadWithRelations.pipelines?.name,
      stage: leadWithRelations.pipeline_stages?.name,
      created_at: leadWithRelations.created_at,
      currency: leadWithRelations.currency,
      notes: leadWithRelations.notes,
      status: leadWithRelations.status,
      workspace_id: record.workspace_id,
      timestamp: new Date().toISOString(),
      source_system: 'leadflow_crm'
    };

    // Enviar para cada webhook n8n
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
        } else {
          console.log(`✅ Successfully sent to n8n webhook: ${webhook.name}`);
        }
      } catch (error) {
        console.error(`❌ Error sending to n8n webhook ${webhook.name}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Lead processed successfully' }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Error in n8n lead notification:', error);
    
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