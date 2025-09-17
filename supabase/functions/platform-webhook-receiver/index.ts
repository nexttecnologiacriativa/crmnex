import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookData {
  // Campos comuns entre plataformas
  buyer_name?: string;
  buyer_email?: string;
  buyer_phone?: string;
  product_name?: string;
  purchase_value?: number;
  currency?: string;
  transaction_id?: string;
  status?: string;
  
  // Hotmart específico
  hottok?: string;
  prod?: string;
  email?: string;
  name?: string;
  phone?: string;
  price?: number;
  
  // Eduzz específico
  cus_name?: string;
  cus_email?: string;
  cus_phone?: string;
  pro_name?: string;
  sale_value?: number;
  
  // Monetizze específico
  comprador_nome?: string;
  comprador_email?: string;
  comprador_telefone?: string;
  produto_nome?: string;
  venda_valor?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url);
    const integrationId = url.searchParams.get('integration_id');
    
    if (!integrationId) {
      console.error('Integration ID não fornecido');
      return new Response(
        JSON.stringify({ error: 'Integration ID é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse webhook data
    let webhookData: WebhookData = {};
    
    if (req.method === 'POST') {
      const contentType = req.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        webhookData = await req.json();
      } else if (contentType?.includes('application/x-www-form-urlencoded')) {
        const formData = await req.formData();
        webhookData = Object.fromEntries(formData);
      }
    } else if (req.method === 'GET') {
      // Para plataformas que enviam via GET
      const searchParams = url.searchParams;
      webhookData = Object.fromEntries(searchParams);
    }

    console.log('Webhook recebido:', { integrationId, webhookData });

    // Normalizar dados baseado na plataforma
    const normalizedData = normalizeWebhookData(webhookData);
    
    if (!normalizedData.email || !normalizedData.name) {
      console.error('Dados insuficientes no webhook:', normalizedData);
      return new Response(
        JSON.stringify({ error: 'Email e nome são obrigatórios' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Buscar configuração da integração no banco
    const { data: integrationConfig, error: configError } = await supabase
      .from('platform_integrations')
      .select('*')
      .ilike('webhook_url', `%${integrationId}%`)
      .eq('is_active', true)
      .single();

    if (configError || !integrationConfig) {
      console.error('Configuração da integração não encontrada:', configError);
      return new Response(
        JSON.stringify({ error: 'Integração não encontrada ou inativa' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Buscar pipeline e estágio configurados
    const { data: pipeline } = await supabase
      .from('pipelines')
      .select('id, pipeline_stages!inner(id)')
      .eq('id', integrationConfig.selected_pipeline_id)
      .single();

    if (!pipeline || !pipeline.pipeline_stages?.length) {
      console.error('Pipeline configurado não encontrado');
      return new Response(
        JSON.stringify({ error: 'Pipeline configurado não encontrado' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verificar se lead já existe
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('email', normalizedData.email)
      .eq('workspace_id', integrationConfig.workspace_id)
      .single();

    let leadId: string;

    if (existingLead) {
      // Atualizar lead existente
      console.log('Atualizando lead existente:', existingLead.id);
      
      const { data: updatedLead, error: updateError } = await supabase
        .from('leads')
        .update({
          name: normalizedData.name,
          phone: normalizedData.phone,
          value: normalizedData.value,
          status: 'won', // Marcado como ganho
          pipeline_tag: 'ganho',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLead.id)
        .select()
        .single();

      if (updateError) {
        console.error('Erro ao atualizar lead:', updateError);
        throw updateError;
      }

      leadId = existingLead.id;
    } else {
      // Criar novo lead
      console.log('Criando novo lead');
      
      const { data: newLead, error: createError } = await supabase
        .from('leads')
        .insert({
          workspace_id: integrationConfig.workspace_id,
          pipeline_id: pipeline.id,
          stage_id: pipeline.pipeline_stages[0].id,
          name: normalizedData.name,
          email: normalizedData.email,
          phone: normalizedData.phone,
          value: normalizedData.value,
          status: 'won', // Marcado como ganho
          pipeline_tag: 'ganho',
          source: integrationConfig.platform,
          notes: `Lead criado automaticamente via webhook ${integrationConfig.platform}. Transação: ${normalizedData.transaction_id || 'N/A'}`
        })
        .select()
        .single();

      if (createError) {
        console.error('Erro ao criar lead:', createError);
        throw createError;
      }

      leadId = newLead.id;
    }

    // Aplicar tags configuradas
    if (integrationConfig.selected_tag_ids && integrationConfig.selected_tag_ids.length > 0) {
      console.log('Aplicando tags:', integrationConfig.selected_tag_ids);
      
      const tagRelations = integrationConfig.selected_tag_ids.map(tagId => ({
        lead_id: leadId,
        tag_id: tagId
      }));
      
      const { error: tagError } = await supabase
        .from('lead_tag_relations')
        .insert(tagRelations);
        
      if (tagError) {
        console.error('Erro ao aplicar tags:', tagError);
        // Não falhar por causa das tags, apenas logar
      } else {
        // Triggers do banco já inserem na fila (automation_queue) com 'tag_applied'
        // Evitar duplicidade: nenhuma invocação direta aqui
        console.log('ℹ️ Tags aplicadas; automações serão processadas via automation_queue');
      }
    }

    console.log('Lead processado com sucesso:', leadId);

    // Log da atividade
    await supabase
      .from('lead_activities')
      .insert({
        lead_id: leadId,
        user_id: integrationConfig.workspace_id, // Usar workspace como user para webhooks
        title: `Venda recebida via ${integrationConfig.platform}`,
        description: `Webhook processado. Valor: ${normalizedData.value || 'N/A'}. Transação: ${normalizedData.transaction_id || 'N/A'}`,
        activity_type: 'webhook'
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        lead_id: leadId,
        message: 'Webhook processado com sucesso' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function normalizeWebhookData(data: WebhookData) {
  // Normalizar dados de diferentes plataformas para um formato padrão
  return {
    name: data.buyer_name || data.name || data.cus_name || data.comprador_nome || '',
    email: data.buyer_email || data.email || data.cus_email || data.comprador_email || '',
    phone: data.buyer_phone || data.phone || data.cus_phone || data.comprador_telefone || '',
    value: data.purchase_value || data.price || data.sale_value || data.venda_valor || 0,
    product_name: data.product_name || data.prod || data.pro_name || data.produto_nome || '',
    transaction_id: data.transaction_id || data.hottok || '',
    currency: data.currency || 'BRL'
  };
}