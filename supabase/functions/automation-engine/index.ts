import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, lead_id, tag_id, workspace_id, flow_id, old_stage_id, new_stage_id, pipeline_id, campaign_id, api_type } = await req.json();
    
    console.log('🤖 Automation trigger received:', { 
      action, 
      lead_id, 
      tag_id, 
      workspace_id,
      flow_id,
      old_stage_id,
      new_stage_id,
      pipeline_id,
      campaign_id,
      api_type
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === 'process_tag_applied') {
      return await processTagApplied(supabase, { lead_id, tag_id, workspace_id });
    } else if (action === 'process_lead_created_with_tag') {
      return await processLeadCreatedWithTag(supabase, { lead_id, tag_id, workspace_id });
    } else if (action === 'process_lead_created') {
      return await processLeadCreated(supabase, { lead_id, workspace_id });
    } else if (action === 'execute_flow') {
      return await executeFlow(supabase, { lead_id, flow_id, workspace_id });
    } else if (action === 'process_pipeline_stage_changed') {
      return await processPipelineStageChanged(supabase, { lead_id, workspace_id, old_stage_id, new_stage_id, pipeline_id });
    } else if (action === 'process_marketing_campaign') {
      return await processMarketingCampaign(supabase, { campaign_id, api_type, workspace_id });
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('❌ Automation engine error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process automation', 
        details: (error as Error).message || 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processPipelineStageChanged(supabase: any, { lead_id, workspace_id, old_stage_id, new_stage_id, pipeline_id }: any) {
  console.log('📊 Processing pipeline stage changed:', { lead_id, old_stage_id, new_stage_id, pipeline_id });

  // Buscar fluxos ativos que são disparados por mudança de etapa
  const { data: flows, error: flowsError } = await supabase
    .from('automation_flows')
    .select('*')
    .eq('workspace_id', workspace_id)
    .eq('is_active', true)
    .eq('trigger_type', 'pipeline_stage_changed');

  if (flowsError) {
    console.error('❌ Error fetching flows:', flowsError);
    throw flowsError;
  }

  console.log(`📋 Found ${flows?.length || 0} active stage-change flows`);

  if (!flows || flows.length === 0) {
    return new Response(
      JSON.stringify({ message: 'No active flows found for stage change trigger', processed: 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let processedFlows = 0;

  for (const flow of flows) {
    try {
      const triggerConfig = flow.trigger_config || {};
      
      // Verificar se o pipeline e etapa correspondem à configuração
      if (triggerConfig.pipeline_id && triggerConfig.pipeline_id !== pipeline_id) {
        console.log(`⏭️ Skipping flow ${flow.name} - different pipeline`);
        continue;
      }
      
      if (triggerConfig.target_stage_id && triggerConfig.target_stage_id !== new_stage_id) {
        console.log(`⏭️ Skipping flow ${flow.name} - different target stage`);
        continue;
      }

      // Executar o fluxo
      await executeFlowForLead(supabase, flow, lead_id, workspace_id);
      processedFlows++;

    } catch (flowError) {
      console.error(`❌ Error processing flow ${flow.name}:`, flowError);
      
      await createAutomationLog(supabase, {
        workspace_id,
        flow_id: flow.id,
        lead_id,
        step_name: 'Execução do fluxo',
        status: 'error',
        error_message: (flowError as Error).message || 'Unknown error'
      });
    }
  }

  console.log(`🎯 Stage change processing complete: ${processedFlows} flows processed`);

  return new Response(
    JSON.stringify({ 
      success: true,
      processed_flows: processedFlows,
      message: `Processed ${processedFlows} flows for stage change`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function processLeadCreated(supabase: any, { lead_id, workspace_id }: any) {
  console.log('🆕 Processing lead created:', { lead_id, workspace_id });

  // Buscar fluxos ativos que são disparados por criação de lead
  const { data: flows, error: flowsError } = await supabase
    .from('automation_flows')
    .select('*')
    .eq('workspace_id', workspace_id)
    .eq('is_active', true)
    .eq('trigger_type', 'lead_created');

  if (flowsError) {
    console.error('❌ Error fetching lead_created flows:', flowsError);
    throw flowsError;
  }

  console.log(`📋 Found ${flows?.length || 0} active lead_created flows`);

  if (!flows || flows.length === 0) {
    return new Response(
      JSON.stringify({ message: 'No active flows found for lead_created trigger', processed: 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let processedFlows = 0;

  for (const flow of flows) {
    try {
      await executeFlowForLead(supabase, flow, lead_id, workspace_id);
      processedFlows++;
    } catch (flowError) {
      console.error(`❌ Error processing flow ${flow.name}:`, flowError);
      
      await createAutomationLog(supabase, {
        workspace_id,
        flow_id: flow.id,
        lead_id,
        step_name: 'Execução do fluxo',
        status: 'error',
        error_message: (flowError as Error).message || 'Unknown error'
      });
    }
  }

  console.log(`🎯 Lead created processing complete: ${processedFlows} flows processed`);

  return new Response(
    JSON.stringify({ 
      success: true,
      processed_flows: processedFlows,
      message: `Processed ${processedFlows} flows for lead creation`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function processLeadCreatedWithTag(supabase: any, { lead_id, tag_id, workspace_id }: any) {
  console.log('🆕 Processing lead created with tag:', { lead_id, tag_id });

  // 1. Buscar fluxos ativos que são disparados por criação de lead com tag específica
  const { data: flows, error: flowsError } = await supabase
    .from('automation_flows')
    .select('*')
    .eq('workspace_id', workspace_id)
    .eq('is_active', true)
    .eq('trigger_type', 'lead_created_with_tag');

  if (flowsError) {
    console.error('❌ Error fetching flows:', flowsError);
    throw flowsError;
  }

  console.log(`📋 Found ${flows?.length || 0} active lead-created-with-tag flows`);

  if (!flows || flows.length === 0) {
    return new Response(
      JSON.stringify({ message: 'No active flows found for lead created with tag trigger', processed: 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let processedFlows = 0;

  // 2. Processar cada fluxo
  for (const flow of flows) {
    try {
      // Verificar se a tag está na configuração do gatilho
      const triggerTags = flow.trigger_config?.tags || [];
      if (!triggerTags.includes(tag_id)) {
        console.log(`⏭️ Skipping flow ${flow.name} - tag not in trigger`);
        continue;
      }

      // Executar o fluxo
      await executeFlowForLead(supabase, flow, lead_id, workspace_id);
      processedFlows++;

    } catch (flowError) {
      console.error(`❌ Error processing flow ${flow.name}:`, flowError);
      
      // Registrar log de erro
      await createAutomationLog(supabase, {
        workspace_id,
        flow_id: flow.id,
        lead_id,
        step_name: 'Execução do fluxo',
        status: 'error',
        error_message: (flowError as Error).message || 'Unknown error'
      });
    }
  }

  console.log(`🎯 Lead created with tag processing complete: ${processedFlows} flows processed`);

  return new Response(
    JSON.stringify({ 
      success: true,
      processed_flows: processedFlows,
      message: `Processed ${processedFlows} flows for lead created with tag`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function processTagApplied(supabase: any, { lead_id, tag_id, workspace_id }: any) {
  console.log('🏷️ Processing tag applied:', { lead_id, tag_id });

  // 1. Buscar fluxos ativos que são disparados por essa tag
  // Incluindo tanto "tag_applied" quanto "lead_created_with_tag" para cobrir ambos os casos
  const { data: flows, error: flowsError } = await supabase
    .from('automation_flows')
    .select('*')
    .eq('workspace_id', workspace_id)
    .eq('is_active', true)
    .in('trigger_type', ['tag_applied', 'tag_added', 'lead_created_with_tag']);

  if (flowsError) {
    console.error('❌ Error fetching flows:', flowsError);
    throw flowsError;
  }

  console.log(`📋 Found ${flows?.length || 0} active tag-triggered flows (including lead_created_with_tag)`);

  if (!flows || flows.length === 0) {
    return new Response(
      JSON.stringify({ message: 'No active flows found for tag trigger', processed: 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let processedFlows = 0;

  // 2. Processar cada fluxo
  for (const flow of flows) {
    try {
      // Verificar se a tag está na configuração do gatilho
      const triggerTags = flow.trigger_config?.tags || [];
      if (!triggerTags.includes(tag_id)) {
        console.log(`⏭️ Skipping flow ${flow.name} - tag not in trigger`);
        continue;
      }

      // Executar o fluxo
      await executeFlowForLead(supabase, flow, lead_id, workspace_id);
      processedFlows++;

    } catch (flowError) {
      console.error(`❌ Error processing flow ${flow.name}:`, flowError);
      
      // Registrar log de erro
      await createAutomationLog(supabase, {
        workspace_id,
        flow_id: flow.id,
        lead_id,
        step_name: 'Execução do fluxo',
        status: 'error',
        error_message: (flowError as Error).message || 'Unknown error'
      });
    }
  }

  console.log(`🎯 Tag processing complete: ${processedFlows} flows processed`);

  return new Response(
    JSON.stringify({ 
      success: true,
      processed_flows: processedFlows,
      message: `Processed ${processedFlows} flows for tag application`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function executeFlow(supabase: any, { lead_id, flow_id, workspace_id }: any) {
  console.log('⚡ Executing specific flow:', { flow_id, lead_id });

  // Buscar o fluxo
  const { data: flow, error: flowError } = await supabase
    .from('automation_flows')
    .select('*')
    .eq('id', flow_id)
    .eq('workspace_id', workspace_id)
    .single();

  if (flowError || !flow) {
    throw new Error(`Flow not found: ${flow_id}`);
  }

  if (!flow.is_active) {
    throw new Error(`Flow is not active: ${flow.name}`);
  }

  await executeFlowForLead(supabase, flow, lead_id, workspace_id);

  return new Response(
    JSON.stringify({ 
      success: true,
      message: `Flow ${flow.name} executed successfully`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function executeFlowForLead(supabase: any, flow: any, lead_id: string, workspace_id: string) {
  console.log(`🚀 Executing flow: ${flow.name} for lead: ${lead_id}`);

  // Verificar se já foi executado para este lead (se send_once_per_lead estiver ativo)
  if (flow.send_once_per_lead) {
    const { data: existingExecution } = await supabase
      .from('automation_executions')
      .select('id')
      .eq('flow_id', flow.id)
      .eq('lead_id', lead_id)
      .single();

    if (existingExecution) {
      console.log(`⏭️ Skipping flow ${flow.name} - already executed for this lead`);
      return;
    }
  }

  // Buscar informações do lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*, whatsapp_conversations(phone_number)')
    .eq('id', lead_id)
    .single();

  if (leadError || !lead) {
    throw new Error(`Lead not found: ${lead_id}`);
  }

  console.log('👤 Lead found:', lead.name);

  // Executar os passos do fluxo
  const steps = flow.steps || [];
  let executionSuccess = true;
  let lastError = null;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(`📝 Executing step ${i + 1}: ${step.type}`);

    try {
      if (step.type === 'send_message' && step.config?.evolution_instance) {
        await executeEvolutionMessageStep(supabase, step, lead, workspace_id, flow);
      } else if (step.type === 'send_message') {
        await executeMessageStep(supabase, step, lead, workspace_id, flow);
      } else if (step.type === 'apply_tag') {
        await executeTagStep(supabase, step, lead_id);
      } else if (step.type === 'wait') {
        await executeWaitStep(step);
      } else if (step.type === 'move_to_stage') {
        await executeMoveToStageStep(supabase, step, lead_id);
      }

      // Registrar log de sucesso
      await createAutomationLog(supabase, {
        workspace_id,
        flow_id: flow.id,
        lead_id,
        step_name: `${step.type} - Passo ${i + 1}`,
        status: 'success',
        message_sent: step.type === 'send_message' ? 'Mensagem enviada com sucesso' : null
      });

    } catch (stepError) {
      console.error(`❌ Error in step ${i + 1}:`, stepError);
      executionSuccess = false;
      lastError = (stepError as Error).message || 'Unknown error';

      // Registrar log de erro
      await createAutomationLog(supabase, {
        workspace_id,
        flow_id: flow.id,
        lead_id,
        step_name: `${step.type} - Passo ${i + 1}`,
        status: 'error',
        error_message: (stepError as Error).message || 'Unknown error'
      });

      break; // Parar execução em caso de erro
    }
  }

  // Registrar execução se bem-sucedida
  if (executionSuccess) {
    await supabase
      .from('automation_executions')
      .insert({
        workspace_id,
        flow_id: flow.id,
        lead_id,
        executed_at: new Date().toISOString()
      });

    // Atualizar contador de execuções do fluxo
    await supabase
      .from('automation_flows')
      .update({
        execution_count: (flow.execution_count || 0) + 1
      })
      .eq('id', flow.id);

    console.log(`✅ Flow ${flow.name} executed successfully`);
  } else {
    console.log(`❌ Flow ${flow.name} failed: ${lastError}`);
    throw new Error(`Flow execution failed: ${lastError}`);
  }
}

// Helper function to select best available WhatsApp instance
async function selectBestWhatsAppInstance(supabase: any, workspace_id: string, preferredInstance?: string) {
  console.log('🔍 Selecting best WhatsApp instance...');
  
  let query = supabase
    .from('whatsapp_instances')
    .select('*')
    .eq('workspace_id', workspace_id)
    .in('status', ['open'])
    .order('last_seen', { ascending: false });

  const { data: instances, error } = await query;

  if (error) {
    console.error('❌ Error fetching instances:', error);
    throw new Error('Failed to fetch WhatsApp instances');
  }

  if (!instances || instances.length === 0) {
    console.error('❌ No open WhatsApp instances found');
    throw new Error('No open WhatsApp instances available');
  }

  // If preferred instance is specified and available, use it
  if (preferredInstance) {
    const preferred = instances.find((i: any) => i.instance_name === preferredInstance);
    if (preferred) {
      console.log(`✅ Using preferred instance: ${preferredInstance} (status: ${preferred.status})`);
      return preferred;
    } else {
      console.warn(`⚠️ Preferred instance ${preferredInstance} not available, selecting best alternative`);
    }
  }

  // Otherwise, select the best available instance (most recently seen)
  const selectedInstance = instances[0];
  console.log(`✅ Selected instance: ${selectedInstance.instance_name} (status: ${selectedInstance.status}, last_seen: ${selectedInstance.last_seen})`);
  
  return selectedInstance;
}

// Helper function to normalize phone numbers consistently
function normalizePhoneForEvolution(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  // Remove all non-digit characters
  let cleanPhone = phoneNumber.replace(/\D/g, '');
  
  // Handle Brazilian numbers specifically
  if (cleanPhone.length >= 10) {
    // If it doesn't start with 55 (Brazil code), add it
    if (!cleanPhone.startsWith('55')) {
      // Remove leading 0 if present (trunk prefix)
      if (cleanPhone.startsWith('0')) {
        cleanPhone = cleanPhone.substring(1);
      }
      cleanPhone = '55' + cleanPhone;
    }
  }
  
  console.log(`📞 Phone normalized: ${phoneNumber} -> ${cleanPhone}`);
  return cleanPhone;
}

async function executeEvolutionMessageStep(supabase: any, step: any, lead: any, workspace_id: string, flow: any) {
  console.log('📱 Executing Evolution API message step');
  console.log(`👤 Lead: ${lead.name} (ID: ${lead.id})`);

  let phoneNumber = lead.whatsapp_conversations?.[0]?.phone_number || lead.phone;
  
  if (!phoneNumber) {
    throw new Error('Lead does not have a phone number');
  }

  // Normalize phone number consistently
  phoneNumber = normalizePhoneForEvolution(phoneNumber);

  const preferredInstance = step.config?.evolution_instance;
  let messageText = step.config?.message || 'Olá! Esta é uma mensagem automática.';

  // Substitute variables in message
  messageText = replaceMessageVariables(messageText, lead);
  console.log(`💬 Message text: ${messageText.substring(0, 100)}...`);

  // Get Evolution API configuration for workspace
  const { data: evolutionConfig, error: configError } = await supabase
    .from('whatsapp_evolution_configs')
    .select('api_url, global_api_key')
    .eq('workspace_id', workspace_id)
    .maybeSingle();

  let credentialsSource = 'defaults';
  if (!configError && evolutionConfig?.global_api_key) {
    credentialsSource = 'database';
    console.log('✅ Using Evolution API credentials from database');
  } else {
    console.log('🔧 Using default Evolution API credentials');
  }

  // Select best available instance with retry mechanism
  let instance;
  let lastError;
  
  try {
    instance = await selectBestWhatsAppInstance(supabase, workspace_id, preferredInstance);
  } catch (error) {
    console.error('❌ Failed to select WhatsApp instance:', error);
    throw new Error(`No available WhatsApp instances: ${(error as Error).message || 'Unknown error'}`);
  }

  // Try sending message with selected instance
  console.log(`📤 Sending message to ${phoneNumber} via ${instance.instance_name}`);
  
  const requestBody: Record<string, any> = {
    action: 'send_message',
    instanceName: instance.instance_name,
    phone: phoneNumber,
    message: messageText,
    workspaceId: workspace_id,
  };
  
  if (evolutionConfig?.global_api_key) requestBody.apiKey = evolutionConfig.global_api_key;
  if (evolutionConfig?.api_url) requestBody.apiUrl = evolutionConfig.api_url;

  const { data, error } = await supabase.functions.invoke('whatsapp-evolution', {
    body: requestBody
  });

  if (error) {
    console.error('❌ Evolution API error:', {
      instanceName: instance.instance_name,
      phone: phoneNumber,
      leadId: lead.id,
      leadName: lead.name,
      error: error.message,
      credentialsSource
    });
    
    // Try to get additional instances as fallback
    const { data: fallbackInstances } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('status', 'open')
      .neq('instance_name', instance.instance_name)
      .limit(1);
    
    if (fallbackInstances && fallbackInstances.length > 0) {
      const fallbackInstance = fallbackInstances[0];
      console.log(`🔄 Retrying with fallback instance: ${fallbackInstance.instance_name}`);
      
      const fallbackRequestBody = {
        ...requestBody,
        instanceName: fallbackInstance.instance_name
      };
      
      const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke('whatsapp-evolution', {
        body: fallbackRequestBody
      });
      
      if (fallbackError) {
        console.error('❌ Fallback instance also failed:', fallbackError);
        throw new Error(`Evolution API error (tried ${instance.instance_name} and ${fallbackInstance.instance_name}): ${error.message}`);
      }
      
      console.log(`✅ Message sent successfully via fallback instance: ${fallbackInstance.instance_name}`);
      
      // Após enviar a mensagem com sucesso, mover automaticamente para a próxima etapa
      await moveLeadToNextStage(supabase, lead);
      return fallbackData;
    }
    
    throw new Error(`Evolution API error: ${error.message}`);
  }

  console.log('✅ Evolution API response:', {
    instanceName: instance.instance_name,
    phone: phoneNumber,
    leadId: lead.id,
    leadName: lead.name,
    messageLength: messageText.length,
    success: !!data
  });

  // Após enviar a mensagem com sucesso, mover automaticamente para a próxima etapa
  await moveLeadToNextStage(supabase, lead);
}

function replaceMessageVariables(message: string, lead: any): string {
  let processedMessage = message;
  
  // Substituir variáveis disponíveis
  const variables = {
    '{nome}': lead.name || 'Usuário',
    '{name}': lead.name || 'Usuário',
    '{empresa}': lead.company || '',
    '{company}': lead.company || '',
    '{telefone}': lead.phone || '',
    '{phone}': lead.phone || '',
    '{email}': lead.email || '',
    '{cargo}': lead.position || '',
    '{position}': lead.position || ''
  };

  for (const [variable, value] of Object.entries(variables)) {
    processedMessage = processedMessage.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'gi'), value);
  }

  return processedMessage;
}

async function executeMoveToStageStep(supabase: any, step: any, lead_id: string) {
  console.log('🔄 Executing move to stage step');

  const targetPipelineId = step.config?.pipeline_id;
  const targetStageId = step.config?.stage_id;

  if (!targetPipelineId || !targetStageId) {
    throw new Error('Pipeline ID and Stage ID are required for move_to_stage step');
  }

  // Verificar se a etapa existe
  const { data: stage, error: stageError } = await supabase
    .from('pipeline_stages')
    .select('id, name')
    .eq('id', targetStageId)
    .eq('pipeline_id', targetPipelineId)
    .single();

  if (stageError || !stage) {
    throw new Error(`Target stage not found: ${targetStageId}`);
  }

  // Mover o lead para a nova etapa
  const { error: updateError } = await supabase
    .from('leads')
    .update({
      pipeline_id: targetPipelineId,
      stage_id: targetStageId,
      pipeline_stage_updated_at: new Date().toISOString()
    })
    .eq('id', lead_id);

  if (updateError) {
    throw new Error(`Failed to move lead to stage: ${updateError.message}`);
  }

  console.log(`🔄 Lead moved to stage: ${stage.name}`);
}

async function moveLeadToNextStage(supabase: any, lead: any) {
  try {
    if (!lead?.pipeline_id || !lead?.stage_id) {
      console.log('ℹ️ Lead missing pipeline or stage, skipping auto-move');
      return;
    }

    // Buscar etapas do pipeline ordenadas por position
    const { data: stages, error } = await supabase
      .from('pipeline_stages')
      .select('id, position, name')
      .eq('pipeline_id', lead.pipeline_id)
      .order('position', { ascending: true });

    if (error || !stages || stages.length === 0) {
      console.warn('⚠️ Could not load pipeline stages to move lead:', error?.message);
      return;
    }

    const currentIndex = stages.findIndex((s: any) => s.id === lead.stage_id);
    if (currentIndex === -1 || currentIndex === stages.length - 1) {
      console.log('ℹ️ No next stage found, skipping auto-move');
      return;
    }

    const nextStage = stages[currentIndex + 1];

    const { error: updateError } = await supabase
      .from('leads')
      .update({ stage_id: nextStage.id, pipeline_stage_updated_at: new Date().toISOString() })
      .eq('id', lead.id);

    if (updateError) {
      console.error('❌ Failed to auto-move lead to next stage:', updateError.message);
      return;
    }

    console.log(`➡️ Lead ${lead.id} moved automatically to next stage: ${nextStage.name}`);
  } catch (e: any) {
    console.error('❌ Error during auto-move to next stage:', e.message);
  }
}

async function executeMessageStep(supabase: any, step: any, lead: any, workspace_id: string, flow: any) {
  console.log('📱 Executing message step');

  // Verificar se o lead tem WhatsApp
  const phoneNumber = lead.whatsapp_conversations?.[0]?.phone_number || lead.phone;
  
  if (!phoneNumber) {
    throw new Error('Lead does not have a phone number');
  }

  // Buscar configuração do WhatsApp
  const { data: config } = await supabase
    .from('whatsapp_official_configs')
    .select('access_token, phone_number_id')
    .eq('workspace_id', workspace_id)
    .eq('is_active', true)
    .single();

  if (!config) {
    throw new Error('WhatsApp configuration not found');
  }

  // Buscar template se especificado
  const templateName = step.config?.template;
  if (!templateName) {
    throw new Error('Template not specified in message step');
  }

  // Buscar templates do Meta WhatsApp
  const templatesResponse = await fetch(
    `https://graph.facebook.com/v18.0/${config.phone_number_id}/message_templates`,
    {
      headers: {
        'Authorization': `Bearer ${config.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!templatesResponse.ok) {
    throw new Error('Failed to fetch WhatsApp templates');
  }

  const templatesData = await templatesResponse.json();
  const template = templatesData.data?.find((t: any) => 
    t.name === templateName && t.status === 'APPROVED'
  );

  if (!template) {
    throw new Error(`Template ${templateName} not found or not approved`);
  }

  // Enviar mensagem usando template
  const normalizedPhone = ensureCountryCode55(phoneNumber);
  
  const messagePayload = {
    messaging_product: "whatsapp",
    to: normalizedPhone,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: "pt_BR"
      }
    }
  };

  console.log('📤 Sending template message:', { template: templateName, to: normalizedPhone });

  const messageResponse = await fetch(
    `https://graph.facebook.com/v18.0/${config.phone_number_id}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messagePayload),
    }
  );

  if (!messageResponse.ok) {
    const errorData = await messageResponse.json();
    console.error('❌ WhatsApp API error:', errorData);
    throw new Error(`WhatsApp API error: ${errorData.error?.message || 'Unknown error'}`);
  }

  const responseData = await messageResponse.json();
  console.log('✅ Message sent successfully:', responseData);

  // Salvar mensagem no banco de dados
  const conversation = await getOrCreateConversation(supabase, phoneNumber, workspace_id, lead.id);
  
  await supabase
    .from('whatsapp_messages')
    .insert({
      conversation_id: conversation.id,
      message_text: `Template: ${templateName}`,
      message_type: 'template',
      message_id: responseData.messages?.[0]?.id,
      is_from_lead: false,
      status: 'sent',
      timestamp: new Date().toISOString()
    });

  // Após enviar a mensagem com sucesso, mover automaticamente para a próxima etapa
  await moveLeadToNextStage(supabase, lead);
}

async function executeTagStep(supabase: any, step: any, lead_id: string) {
  console.log('🏷️ Executing tag step');

  const newTagId = step.config?.tag_id;
  if (!newTagId) {
    throw new Error('Tag ID not specified in tag step');
  }

  // Verificar se a tag já está aplicada
  const { data: existingRelation } = await supabase
    .from('lead_tag_relations')
    .select('id')
    .eq('lead_id', lead_id)
    .eq('tag_id', newTagId)
    .single();

  if (existingRelation) {
    console.log('⏭️ Tag already applied, skipping');
    return;
  }

  // Aplicar nova tag ao lead
  await supabase
    .from('lead_tag_relations')
    .insert({
      lead_id,
      tag_id: newTagId
    });

  console.log(`🏷️ Applied tag ${newTagId} to lead ${lead_id}`);
}

async function executeWaitStep(step: any) {
  const waitMinutes = step.config?.minutes || 0;
  console.log(`⏰ Wait step: ${waitMinutes} minutes (simulated)`);
  
  // Em um sistema real, isso seria agendado para execução futura
  // Por enquanto, apenas registramos o log
}

async function processMarketingCampaign(supabase: any, { campaign_id, api_type, workspace_id }: { campaign_id: string, api_type: string, workspace_id: string }) {
  console.log(`📢 Processing marketing campaign: ${campaign_id} (${api_type})`);

  try {
    // Get campaign details with recipients
    const { data: campaign, error: campaignError } = await supabase
      .from('marketing_campaigns')
      .select(`
        *,
        marketing_campaign_recipients (
          id,
          phone_number,
          status
        )
      `)
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      console.error('❌ Campaign not found:', campaignError);
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update campaign status to sending
    await supabase
      .from('marketing_campaigns')
      .update({ status: 'sending' })
      .eq('id', campaign_id);

    let recipients = (campaign.marketing_campaign_recipients || []).filter((r: any) => r.status === 'pending');
    
    // Fallback: fetch recipients directly if none were embedded (relationship might not be mapped)
    if (!recipients || recipients.length === 0) {
      const { data: directRecipients, error: recErr } = await supabase
        .from('marketing_campaign_recipients')
        .select('id, phone_number, status')
        .eq('campaign_id', campaign_id)
        .eq('status', 'pending');
      if (recErr) {
        console.error('❌ Error fetching recipients directly:', recErr);
      }
      recipients = directRecipients || [];
    }

    if (recipients.length === 0) {
      console.log('📢 No pending recipients for campaign');
      await supabase
        .from('marketing_campaigns')
        .update({ status: 'failed' })
        .eq('id', campaign_id);
      
      return new Response(
        JSON.stringify({ success: false, message: 'No recipients to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📢 Found ${recipients.length} recipients to process`);

    let sentCount = 0;
    let failedCount = 0;

    // Process based on API type
    if (api_type === 'evolution') {
      console.log('📱 Using Evolution API for campaign');
      
      // Instance selection handled below using preferred instance when provided

      // Allow preferred instance from campaign.segments
      let preferredInstance: string | undefined = undefined;
      try {
        if (campaign.segments && typeof campaign.segments === 'object') {
          preferredInstance = campaign.segments.evolution_instance;
        }
      } catch (_) {}

      // Select best available instance (respect preferred when available)
      let selectedInstance;
      try {
        selectedInstance = await selectBestWhatsAppInstance(supabase, workspace_id, preferredInstance);
      } catch (error) {
        console.error('❌ No connected Evolution instances:', error);
        await supabase
          .from('marketing_campaigns')
          .update({ status: 'failed' })
          .eq('id', campaign_id);
        return new Response(
          JSON.stringify({ error: `No connected Evolution instances: ${(error as Error).message || 'Unknown error'}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const intervalMinutes = campaign.message_interval_minutes || 2;
      console.log(`⏱️ Message interval: ${intervalMinutes} minutes`);
      console.log(`📱 Selected instance: ${selectedInstance.instance_name} (status: ${selectedInstance.status})`);

      // Process each recipient using the same whatsapp-evolution function used in automations
      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        console.log(`📝 Processing recipient ${i + 1}/${recipients.length}: ${recipient.phone_number}`);
        
        try {
          // Build message text (support multiple templates)
          let messageText = campaign.message_preview || 'Mensagem de campanha';
          try {
            const templates = campaign.multiple_templates ? JSON.parse(campaign.multiple_templates) : [];
            if (Array.isArray(templates) && templates.length > 0) {
              const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
              messageText = randomTemplate?.preview || messageText;
            }
          } catch (e) {
            console.log('⚠️ Error parsing templates, using default message:', (e as Error).message || 'Unknown error');
          }

          const phoneNumber = normalizePhoneForEvolution(recipient.phone_number);

          // Primary attempt via whatsapp-evolution
          let success = false;
          let lastError = '';
          let instanceUsed = selectedInstance;

          const baseBody = {
            action: 'send_message',
            instanceName: selectedInstance.instance_name,
            phone: phoneNumber,
            message: messageText,
            workspaceId: workspace_id,
          } as const;

          const { error: evoErr } = await supabase.functions.invoke('whatsapp-evolution', {
            body: baseBody
          });

          if (!evoErr) {
            success = true;
          } else {
            lastError = evoErr.message;
            console.log('⚠️ Primary instance error:', lastError);

            // Try a fallback open instance
            const { data: fallbackInstances } = await supabase
              .from('whatsapp_instances')
              .select('*')
              .eq('workspace_id', workspace_id)
              .eq('status', 'open')
              .neq('instance_name', selectedInstance.instance_name)
              .limit(1);

            if (fallbackInstances && fallbackInstances.length > 0) {
              const fallback = fallbackInstances[0];
              const { error: fbErr } = await supabase.functions.invoke('whatsapp-evolution', {
                body: { ...baseBody, instanceName: fallback.instance_name }
              });
              if (!fbErr) {
                success = true;
                instanceUsed = fallback;
                console.log(`✅ Fallback instance succeeded: ${fallback.instance_name}`);
              } else {
                lastError += ` | Fallback: ${fbErr.message}`;
              }
            }
          }

          if (success) {
            await supabase
              .from('marketing_campaign_recipients')
              .update({ status: 'sent', sent_at: new Date().toISOString() })
              .eq('id', recipient.id);

            sentCount++;
            console.log(`✅ Message sent successfully to ${recipient.phone_number} via ${instanceUsed.instance_name}`);
          } else {
            await supabase
              .from('marketing_campaign_recipients')
              .update({ status: 'failed', failed_at: new Date().toISOString(), error_message: lastError })
              .eq('id', recipient.id);

            failedCount++;
            console.log(`❌ Failed to send message to ${recipient.phone_number}: ${lastError}`);
          }

          // Rate limiting between messages
          if (i < recipients.length - 1) {
            console.log(`⏰ Waiting ${intervalMinutes} minutes before next message...`);
            await new Promise(resolve => setTimeout(resolve, intervalMinutes * 60 * 1000));
          }
        } catch (error) {
          console.error(`❌ Error sending to ${recipient.phone_number}:`, error);
          await supabase
            .from('marketing_campaign_recipients')
            .update({ status: 'failed', failed_at: new Date().toISOString(), error_message: (error as Error).message || 'Unknown error' })
            .eq('id', recipient.id);

          failedCount++;
        }
      }
    } else if (api_type === 'whatsapp_official') {
      // Route to WhatsApp Official API function
      console.log('📱 Routing to WhatsApp Official API function');
      
      const { data: sendResult, error: sendError } = await supabase.functions.invoke(
        'marketing-campaign-send',
        { body: { campaignId: campaign_id } }
      );

      if (sendError) {
        console.error('❌ WhatsApp Official send error:', sendError);
        failedCount = recipients.length;
      } else {
        console.log('✅ WhatsApp Official send result:', sendResult);
        // For WhatsApp Official, the marketing-campaign-send function handles the status update
        // So we just return the result without updating status here
        return new Response(
          JSON.stringify(sendResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.log('❌ Unknown API type:', api_type);
      failedCount = recipients.length;
    }

    console.log(`📢 Campaign completed: ${sentCount} sent, ${failedCount} failed`);
    console.log(`📊 Final status calculation: sentCount=${sentCount}, finalStatus will be: ${sentCount > 0 ? 'sent' : 'failed'}`);

    // Update final campaign status
    const finalStatus = sentCount > 0 ? 'sent' : 'failed';
    await supabase
      .from('marketing_campaigns')
      .update({ 
        status: finalStatus,
        sent_at: sentCount > 0 ? new Date().toISOString() : null
      })
      .eq('id', campaign_id);

    console.log(`✅ Campaign status updated to: ${finalStatus}`);


    return new Response(
      JSON.stringify({
        success: true,
        campaign_id,
        sent_count: sentCount,
        failed_count: failedCount,
        total_recipients: recipients.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error processing marketing campaign:', error);
    
    // Update campaign status to failed
    await supabase
      .from('marketing_campaigns')
      .update({ status: 'failed' })
      .eq('id', campaign_id);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function createAutomationLog(supabase: any, logData: any) {
  await supabase
    .from('automation_logs')
    .insert({
      ...logData,
      executed_at: new Date().toISOString()
    });
}

async function getOrCreateConversation(supabase: any, phoneNumber: string, workspace_id: string, lead_id: string) {
  // Buscar conversa existente
  const { data: existingConversation } = await supabase
    .from('whatsapp_conversations')
    .select('id')
    .eq('phone_number', phoneNumber)
    .eq('workspace_id', workspace_id)
    .single();

  if (existingConversation) {
    return existingConversation;
  }

  // Criar nova conversa
  const { data: newConversation, error } = await supabase
    .from('whatsapp_conversations')
    .insert({
      phone_number: phoneNumber,
      workspace_id,
      lead_id,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return newConversation;
}

/**
 * Ensures phone number has Brazil country code (55) for sending messages
 */
function ensureCountryCode55(phone: string): string {
  if (!phone) return '';
  
  const digitsOnly = phone.replace(/\D/g, '');
  
  // If already has 55 prefix and correct length, return as is
  if (digitsOnly.startsWith('55') && digitsOnly.length >= 13) {
    return digitsOnly;
  }
  
  // Add 55 prefix if missing
  return `55${digitsOnly}`;
}

/**
 * Normalizes phone number for WhatsApp by removing non-digits and ensuring proper format
 */
function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // If phone starts with country code 55 and has proper length, use as is
  if (digitsOnly.startsWith('55') && (digitsOnly.length === 12 || digitsOnly.length === 13)) {
    return digitsOnly;
  }
  
  // If phone has 10 or 11 digits (Brazilian format), add country code
  if (digitsOnly.length === 10 || digitsOnly.length === 11) {
    return '55' + digitsOnly;
  }
  
  // For other cases, return as is
  return digitsOnly;
}
