
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function processPhone(phone: string): string {
  if (!phone) return '';
  
  // Remove todos os caracteres não numéricos
  const cleanPhone = phone.replace(/\D/g, '');
  
  console.log('Processing phone:', phone, '-> clean:', cleanPhone);
  
  // Se começar com 55 (Brasil) e tiver mais de 11 dígitos, remove o 55
  if (cleanPhone.startsWith('55') && cleanPhone.length > 11) {
    const result = cleanPhone.substring(2);
    console.log('Removed country code 55:', result);
    return result;
  }
  
  console.log('Phone processed as:', cleanPhone);
  return cleanPhone;
}

function extractElementorData(data: any): any {
  console.log('Extracting Elementor data from:', JSON.stringify(data, null, 2));
  
  const result: any = {};
  
  // Processar dados do formato fields[campo][value]
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('fields[') && key.endsWith('][value]')) {
      const fieldName = key.match(/fields\[(.+?)\]\[value\]/)?.[1];
      if (fieldName) {
        result[fieldName] = value;
        console.log(`Extracted field: ${fieldName} = ${value}`);
      }
    }
  }
  
  // Se não encontrou campos no formato Elementor, usar os dados como estão
  if (Object.keys(result).length === 0) {
    console.log('No Elementor fields found, using original data');
    return data;
  }
  
  console.log('Elementor extracted data:', JSON.stringify(result, null, 2));
  return result;
}

async function parseRequestData(req: Request): Promise<any> {
  const contentType = req.headers.get('content-type') || '';
  
  console.log('Content-Type:', contentType);
  
  if (contentType.includes('application/json')) {
    const jsonData = await req.json();
    console.log('JSON data received:', JSON.stringify(jsonData, null, 2));
    return jsonData;
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await req.text();
    console.log('Form data received:', formData);
    
    const params = new URLSearchParams(formData);
    const data: any = {};
    
    for (const [key, value] of params.entries()) {
      data[key] = value;
    }
    
    console.log('Parsed form data:', JSON.stringify(data, null, 2));
    
    const extractedData = extractElementorData(data);
    return extractedData;
  } else {
    const text = await req.text();
    console.log('Raw request body:', text);
    
    try {
      return JSON.parse(text);
    } catch {
      const params = new URLSearchParams(text);
      const data: any = {};
      
      for (const [key, value] of params.entries()) {
        data[key] = value;
      }
      
      const extractedData = extractElementorData(data);
      return extractedData;
    }
  }
}

async function processTags(supabaseClient: any, tags: string | string[], workspaceId: string): Promise<string[]> {
  if (!tags || !workspaceId) return [];
  
  // Converter string em array se necessário
  let tagList: string[] = [];
  if (typeof tags === 'string') {
    // Separar por vírgula, ponto e vírgula ou quebra de linha
    tagList = tags.split(/[,;\n]/).map(tag => tag.trim()).filter(tag => tag.length > 0);
  } else if (Array.isArray(tags)) {
    tagList = tags.map(tag => String(tag).trim()).filter(tag => tag.length > 0);
  }
  
  if (tagList.length === 0) return [];
  
  console.log('Processing tags:', tagList, 'for workspace:', workspaceId);
  
  const tagIds: string[] = [];
  
  for (const tagName of tagList) {
    try {
      // Verificar se a tag já existe neste workspace
      const { data: existingTag, error: searchError } = await supabaseClient
        .from('lead_tags')
        .select('id')
        .eq('name', tagName)
        .eq('workspace_id', workspaceId)
        .maybeSingle();
      
      if (searchError) {
        console.error('Error searching for tag:', tagName, searchError);
        continue;
      }
      
      if (existingTag) {
        console.log('Tag already exists:', tagName, 'ID:', existingTag.id);
        tagIds.push(existingTag.id);
      } else {
        // Criar nova tag com workspace_id
        const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f97316'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        const { data: newTag, error: createError } = await supabaseClient
          .from('lead_tags')
          .insert({
            name: tagName,
            color: randomColor,
            workspace_id: workspaceId
          })
          .select('id')
          .single();
        
        if (createError) {
          console.error('Error creating tag:', tagName, createError);
          continue;
        }
        
        console.log('Created new tag:', tagName, 'ID:', newTag.id);
        tagIds.push(newTag.id);
      }
    } catch (error) {
      console.error('Error processing tag:', tagName, error);
    }
  }
  
  console.log('Processed tag IDs:', tagIds);
  return tagIds;
}

async function addTagsToLead(supabaseClient: any, leadId: string, tagIds: string[]): Promise<void> {
  if (!tagIds || tagIds.length === 0) return;
  
  console.log('Adding tags to lead:', leadId, 'Tags:', tagIds);
  
  for (const tagId of tagIds) {
    try {
      // Verificar se a relação já existe
      const { data: existingRelation, error: checkError } = await supabaseClient
        .from('lead_tag_relations')
        .select('id')
        .eq('lead_id', leadId)
        .eq('tag_id', tagId)
        .maybeSingle();
      
      if (checkError) {
        console.error('Error checking tag relation:', checkError);
        continue;
      }
      
      if (!existingRelation) {
        // Criar nova relação
        const { error: relationError } = await supabaseClient
          .from('lead_tag_relations')
          .insert({
            lead_id: leadId,
            tag_id: tagId
          });
        
        if (relationError) {
          console.error('Error creating tag relation:', relationError);
        } else {
          console.log('Tag relation created successfully for tag:', tagId);
        }
      } else {
        console.log('Tag relation already exists for tag:', tagId);
      }
    } catch (error) {
      console.error('Error adding tag to lead:', tagId, error);
    }
  }
}

serve(async (req) => {
  console.log('=== WEBHOOK RECEIVER STARTED ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers');
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const webhookData = await parseRequestData(req);
    console.log('Final webhook data:', JSON.stringify(webhookData, null, 2))

    // Extract lead data from webhook - support multiple field name formats
    const leadData = {
      name: webhookData.name || webhookData.nome || webhookData.full_name || 'Lead sem nome',
      email: webhookData.email || null,
      phone: webhookData.phone || webhookData.telefone || webhookData.celular || null,
      company: webhookData.company || webhookData.empresa || null,
      position: webhookData.position || webhookData.cargo || null,
      source: webhookData.source || webhookData.origem || 'webhook',
      utm_source: webhookData.utm_source || null,
      utm_medium: webhookData.utm_medium || null,
      utm_campaign: webhookData.utm_campaign || null,
      utm_term: webhookData.utm_term || null,
      utm_content: webhookData.utm_content || null,
      value: webhookData.value || webhookData.valor || null,
      notes: webhookData.notes || webhookData.observacoes || null,
      custom_fields: webhookData.custom_fields || {}
    }

    console.log('Lead data before phone processing:', JSON.stringify(leadData, null, 2));

    // Processa o telefone de forma inteligente
    if (leadData.phone) {
      leadData.phone = processPhone(leadData.phone);
      console.log('Phone processed:', leadData.phone);
    }

    // Get workspace and pipeline from the webhook URL or use default
    const url = new URL(req.url)
    let workspaceId = url.searchParams.get('workspace_id')
    let pipelineId = url.searchParams.get('pipeline_id')
    let stageId = url.searchParams.get('stage_id')
    const webhookId = url.searchParams.get('webhook_id')

    console.log('URL params:', { workspaceId, pipelineId, stageId, webhookId });

    // Se webhook_id foi fornecido, buscar as configurações do webhook
    if (webhookId) {
      console.log('Looking up webhook configuration for:', webhookId);
      const { data: webhook, error: webhookError } = await supabaseClient
        .from('webhooks')
        .select('pipeline_id, stage_id, workspace_id')
        .eq('id', webhookId)
        .eq('is_active', true)
        .maybeSingle();

      if (webhookError) {
        console.error('Error getting webhook config:', webhookError);
        throw new Error('Could not find webhook configuration: ' + webhookError.message);
      }

      if (webhook) {
        workspaceId = webhook.workspace_id;
        pipelineId = webhook.pipeline_id;
        stageId = webhook.stage_id;
        console.log('Using webhook configuration:', { workspaceId, pipelineId, stageId });
      } else {
        console.error('Webhook not found or inactive:', webhookId);
        throw new Error('Webhook not found or inactive');
      }
    }

    // Se workspace_id não foi fornecido, pegar o primeiro workspace disponível
    if (!workspaceId) {
      console.log('No workspace_id provided, getting first available workspace');
      const { data: workspaces, error: workspaceError } = await supabaseClient
        .from('workspaces')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1);

      if (workspaceError) {
        console.error('Error getting default workspace:', workspaceError);
        throw new Error('Could not find any workspace: ' + workspaceError.message);
      }

      if (workspaces && workspaces.length > 0) {
        workspaceId = workspaces[0].id
        console.log('Using default workspace:', workspaceId);
      } else {
        throw new Error('No workspaces found in the system');
      }
    }

    // Processar tags se fornecidas (após determinar workspaceId)
    const tags = webhookData.tags || webhookData.tag || null;
    let tagIds: string[] = [];
    if (tags && workspaceId) {
      tagIds = await processTags(supabaseClient, tags, workspaceId);
    }

    // Get pipeline with default values
    let targetPipelineId = pipelineId
    let targetStageId = stageId
    let pipelineData = null

    if (!targetPipelineId) {
      console.log('Getting default pipeline for workspace:', workspaceId);
      const { data: pipelines, error: pipelineError } = await supabaseClient
        .from('pipelines')
        .select('id, default_value, default_assignee')
        .eq('workspace_id', workspaceId)
        .limit(1)

      if (pipelineError) {
        console.error('Error getting pipelines:', pipelineError);
        throw new Error('Could not find pipelines: ' + pipelineError.message);
      }

      if (pipelines && pipelines.length > 0) {
        targetPipelineId = pipelines[0].id
        pipelineData = pipelines[0]
        console.log('Found default pipeline:', targetPipelineId);
      } else {
        throw new Error('No pipelines found for workspace');
      }
    } else {
      // Se pipeline foi especificado, buscar dados do pipeline
      const { data: pipeline, error: pipelineError } = await supabaseClient
        .from('pipelines')
        .select('default_value, default_assignee')
        .eq('id', targetPipelineId)
        .single()

      if (!pipelineError && pipeline) {
        pipelineData = pipeline
      }
    }

    // SEMPRE buscar o primeiro estágio se não foi especificado
    if (!targetStageId && targetPipelineId) {
      console.log('Getting first stage for pipeline:', targetPipelineId);
      const { data: stages, error: stageError } = await supabaseClient
        .from('pipeline_stages')
        .select('id')
        .eq('pipeline_id', targetPipelineId)
        .order('position', { ascending: true })
        .limit(1)

      if (stageError) {
        console.error('Error getting stages:', stageError);
        throw new Error('Could not find stages for pipeline: ' + stageError.message);
      } else if (stages && stages.length > 0) {
        targetStageId = stages[0].id
        console.log('Found first stage:', targetStageId);
      } else {
        throw new Error('No stages found for pipeline: ' + targetPipelineId);
      }
    }

    // Aplicar valor padrão do pipeline se não foi fornecido
    if (pipelineData?.default_value && !leadData.value) {
      leadData.value = pipelineData.default_value
      console.log('Applied default value from pipeline:', leadData.value);
    }

    // Determinar responsável usando a mesma lógica do frontend
    let assignedTo = null
    
    if (pipelineData?.default_assignee) {
      assignedTo = pipelineData.default_assignee
      console.log('Using pipeline default assignee:', assignedTo);
    } else {
      // Buscar admin do workspace como fallback
      const { data: adminUser, error: adminError } = await supabaseClient
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspaceId)
        .eq('role', 'admin')
        .single();

      if (!adminError && adminUser) {
        assignedTo = adminUser.user_id
        console.log('Using workspace admin as assignee:', assignedTo);
      }
    }

    if (!targetPipelineId || !targetStageId) {
      console.error('Could not determine pipeline or stage', { targetPipelineId, targetStageId });
      throw new Error('Could not determine pipeline or stage')
    }

    // Check if lead already exists (by email or phone)
    let existingLead = null
    if (leadData.email || leadData.phone) {
      const conditions = [];
      if (leadData.email) conditions.push(`email.eq.${leadData.email}`);
      if (leadData.phone) conditions.push(`phone.eq.${leadData.phone}`);
      
      console.log('Checking for existing lead with conditions:', conditions);
      
      const { data, error: leadCheckError } = await supabaseClient
        .from('leads')
        .select('id')
        .eq('workspace_id', workspaceId)
        .or(conditions.join(','))
        .maybeSingle()
      
      if (leadCheckError) {
        console.error('Error checking existing lead:', leadCheckError);
      } else {
        existingLead = data
        console.log('Existing lead found:', existingLead);
      }
    }

    if (existingLead) {
      // Update existing lead
      console.log('Updating existing lead:', existingLead.id);
      const updateData = {
        ...leadData,
        updated_at: new Date().toISOString()
      }
      
      // Aplicar assigned_to se determinado
      if (assignedTo) {
        (updateData as any).assigned_to = assignedTo
      }

      const { error } = await supabaseClient
        .from('leads')
        .update(updateData)
        .eq('id', existingLead.id)

      if (error) {
        console.error('Error updating lead:', error);
        throw error
      }

      // Adicionar tags ao lead existente
      if (tagIds.length > 0) {
        await addTagsToLead(supabaseClient, existingLead.id, tagIds);
      }

      console.log('Lead updated successfully:', existingLead.id)
    } else {
      // Create new lead
      const newLeadData = {
        ...leadData,
        workspace_id: workspaceId,
        pipeline_id: targetPipelineId,
        stage_id: targetStageId
      }
      
      // Aplicar assigned_to se determinado (from pipeline default)
      if (assignedTo) {
        (newLeadData as any).assigned_to = assignedTo
      }

      console.log('Creating new lead with data:', JSON.stringify(newLeadData, null, 2));
      
      const { data: newLead, error } = await supabaseClient
        .from('leads')
        .insert(newLeadData)
        .select('id')
        .single()

      if (error) {
        console.error('Error creating lead:', error);
        throw error
      }

      // Create lead_pipeline_relations entry so lead appears in Kanban
      const { error: relationError } = await supabaseClient
        .from('lead_pipeline_relations')
        .upsert({
          lead_id: newLead.id,
          pipeline_id: targetPipelineId,
          stage_id: targetStageId,
          is_primary: true
        }, { onConflict: 'lead_id,pipeline_id' })

      if (relationError) {
        console.warn('Error creating pipeline relation:', relationError)
      }

      // Adicionar tags ao novo lead
      if (tagIds.length > 0) {
        await addTagsToLead(supabaseClient, newLead.id, tagIds);
      }

      // Call lead distribution if no default assignee was set
      if (!assignedTo) {
        console.log('📤 Calling lead distribution...')
        try {
          const { data: distResult, error: distError } = await supabaseClient.functions.invoke('distribute-lead', {
            body: {
              lead_id: newLead.id,
              workspace_id: workspaceId,
              pipeline_id: targetPipelineId,
              source: 'webhook',
              tags: tagIds
            }
          })
          if (distError) {
            console.warn('Distribution invoke error:', distError)
          } else {
            console.log('Distribution result:', distResult)
          }
        } catch (distError) {
          console.warn('Distribution failed (non-blocking):', distError)
        }
      }

      console.log('New lead created successfully with ID:', newLead.id)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Lead processed successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
