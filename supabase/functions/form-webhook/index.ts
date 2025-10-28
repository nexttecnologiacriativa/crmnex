import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Função para extrair dados do Elementor (formato fields[nome][value])
function extractElementorData(data: any): any {
  console.log('🔍 Extracting Elementor data from:', JSON.stringify(data, null, 2));
  
  const result: any = {};
  
  // Processar dados do formato fields[campo][value]
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('fields[') && key.endsWith('][value]')) {
      const fieldName = key.match(/fields\[(.+?)\]\[value\]/)?.[1];
      if (fieldName) {
        result[fieldName] = value;
        console.log(`✅ Extracted Elementor field: ${fieldName} = ${value}`);
      }
    }
  }
  
  // Se não encontrou campos no formato Elementor, usar os dados como estão
  if (Object.keys(result).length === 0) {
    console.log('ℹ️ No Elementor fields found, using original data');
    return data;
  }
  
  console.log('🎯 Elementor extracted data:', JSON.stringify(result, null, 2));
  return result;
}

// Função para processar request body de diferentes formatos
async function parseRequestBody(req: Request): Promise<any> {
  const contentType = req.headers.get('content-type') || '';
  console.log('📄 Content-Type:', contentType);
  
  if (contentType.includes('application/json')) {
    const jsonData = await req.json();
    console.log('📋 JSON data received:', JSON.stringify(jsonData, null, 2));
    return jsonData;
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await req.text();
    console.log('📝 Form data received:', formData);
    
    const params = new URLSearchParams(formData);
    const data: any = {};
    
    for (const [key, value] of params.entries()) {
      data[key] = value;
    }
    
    console.log('📋 Parsed form data:', JSON.stringify(data, null, 2));
    return extractElementorData(data);
  } else {
    const text = await req.text();
    console.log('📄 Raw request body:', text);
    
    try {
      return JSON.parse(text);
    } catch {
      const params = new URLSearchParams(text);
      const data: any = {};
      
      for (const [key, value] of params.entries()) {
        data[key] = value;
      }
      
      return extractElementorData(data);
    }
  }
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

serve(async (req) => {
  console.log('🚀 Form webhook started');
  console.log('📍 Method:', req.method);
  console.log('🌐 URL:', req.url);
  console.log('📋 Headers:', Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Only accept POST requests
    if (req.method !== 'POST') {
      console.log('❌ Method not allowed:', req.method);
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get workspace_id and platform from query params
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get('workspace_id');
    const platform = url.searchParams.get('platform') || 'elementor';
    const pipelineId = url.searchParams.get('pipeline_id');

    console.log('🔧 Parameters:', { workspaceId, platform, pipelineId });

    if (!workspaceId) {
      console.error('❌ Missing workspace_id parameter');
      return new Response(
        JSON.stringify({ error: 'workspace_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body with improved error handling
    let formData;
    try {
      formData = await parseRequestBody(req);
      console.log('📋 Processed form data:', JSON.stringify(formData, null, 2));
    } catch (parseError) {
      console.error('❌ Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request body', 
          details: parseError.message 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get custom fields for this workspace
    const { data: customFields, error: customFieldsError } = await supabase
      .from('custom_fields')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (customFieldsError) {
      console.error('Error fetching custom fields:', customFieldsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch custom fields' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get default pipeline if not specified
    let targetPipelineId = pipelineId;
    if (!targetPipelineId) {
      const { data: defaultPipeline } = await supabase
        .from('pipelines')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('is_default', true)
        .single();
      
      targetPipelineId = defaultPipeline?.id;
    }

    if (!targetPipelineId) {
      return new Response(
        JSON.stringify({ error: 'No pipeline found for this workspace' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get first stage of the pipeline
    const { data: firstStage } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('pipeline_id', targetPipelineId)
      .order('position', { ascending: true })
      .limit(1)
      .single();

    if (!firstStage) {
      return new Response(
        JSON.stringify({ error: 'No stages found in pipeline' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Extract basic lead info from form data
    const name = formData.name || formData.nome || formData.full_name || formData.first_name || 'Lead sem nome';
    const email = formData.email || formData.e_mail || formData.email_address || null;
    const rawPhone = formData.phone || formData.telefone || formData.whatsapp || formData.celular || null;
    const phone = rawPhone ? processPhone(rawPhone) : null;
    const company = formData.company || formData.empresa || null;

    // Map form data to custom fields
    const customFieldsData: Record<string, any> = {};
    
    if (customFields && customFields.length > 0) {
      customFields.forEach((field) => {
        const fieldName = field.name.toLowerCase();
        
        // Try to find matching field in form data (case insensitive)
        for (const [key, value] of Object.entries(formData)) {
          const keyLower = key.toLowerCase();
          
          // Direct match or similar variations
          if (keyLower === fieldName || 
              keyLower.includes(fieldName) || 
              fieldName.includes(keyLower)) {
            customFieldsData[field.name] = value;
            break;
          }
        }
      });
    }

    // Also include any additional fields that weren't mapped to custom fields
    const additionalFields: Record<string, any> = {};
    for (const [key, value] of Object.entries(formData)) {
      const isBasicField = [
        'name', 'nome', 'full_name', 'first_name', 
        'email', 'e_mail', 'email_address', 
        'phone', 'telefone', 'whatsapp', 'celular', 
        'company', 'empresa',
        'origem', 'source',
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'tag', 'tags'
      ].includes(key.toLowerCase());
      const isMappedToCustomField = Object.values(customFieldsData).includes(value);
      
      if (!isBasicField && !isMappedToCustomField) {
        additionalFields[key] = value;
      }
    }

    // Create the lead
    const leadData = {
      workspace_id: workspaceId,
      pipeline_id: targetPipelineId,
      stage_id: firstStage.id,
      name,
      email,
      phone,
      company,
      source: formData.source || formData.origem || `${platform}_form`,
      utm_source: formData.utm_source || null,
      utm_medium: formData.utm_medium || null,
      utm_campaign: formData.utm_campaign || null,
      utm_term: formData.utm_term || null,
      utm_content: formData.utm_content || null,
      custom_fields: { ...customFieldsData, ...additionalFields },
      notes: `Lead criado via formulário ${platform} em ${new Date().toLocaleString('pt-BR')}`
    };

    console.log('📋 Custom fields data:', JSON.stringify(customFieldsData, null, 2));
    console.log('📋 Additional fields:', JSON.stringify(additionalFields, null, 2));
    console.log('📋 Final custom_fields:', JSON.stringify({ ...customFieldsData, ...additionalFields }, null, 2));
    console.log('Creating lead with data:', leadData);

    const { data: newLead, error: leadError } = await supabase
      .from('leads')
      .insert(leadData)
      .select()
      .single();

    if (leadError) {
      console.error('Error creating lead:', leadError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create lead', 
          details: leadError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Lead created successfully:', newLead.id);

    // Processar automações para lead criado
    try {
      console.log('🤖 Processing automations for new lead:', newLead.id);
      
      // Chamar automações do tipo 'lead_created' (sem necessidade de tag)
      const { data: leadCreatedResult, error: leadCreatedError } = await supabase.functions.invoke('automation-engine', {
        body: {
          action: 'process_lead_created',
          lead_id: newLead.id,
          workspace_id: workspaceId
        }
      });

      if (leadCreatedError) {
        console.error('❌ Error processing lead_created automation:', leadCreatedError);
      } else {
        console.log('✅ Lead created automation result:', leadCreatedResult);
      }

      // Se o formulário enviou tags, aplicar e disparar automações de tag_applied
      const parseTags = (value: unknown): string[] => {
        if (!value) return [];
        if (Array.isArray(value)) return value.map((t) => String(t).trim()).filter(Boolean);
        if (typeof value === 'string') return value.split(',').map((t) => t.trim()).filter(Boolean);
        return [];
      };

      const incomingTagNames = [
        ...parseTags((formData as any).tags),
        ...parseTags((formData as any).tag)
      ];

      if (incomingTagNames.length > 0) {
        console.log('🏷️ Tags recebidas no formulário:', incomingTagNames);
        const { data: availableTags, error: tagsFetchError } = await supabase
          .from('lead_tags')
          .select('id, name')
          .eq('workspace_id', workspaceId)
          .in('name', incomingTagNames);

        if (tagsFetchError) {
          console.warn('⚠️ Falha ao buscar tags por nome:', tagsFetchError);
        } else if (availableTags && availableTags.length > 0) {
          const relations = availableTags.map((t) => ({ lead_id: newLead.id, tag_id: t.id }));
          const { error: relErr } = await supabase.from('lead_tag_relations').insert(relations);
          if (relErr) {
            console.warn('⚠️ Falha ao criar relações de tag:', relErr);
          } else {
            try {
              await Promise.all(
                availableTags.map((t) =>
                  supabase.functions.invoke('automation-engine', {
                    body: {
                      action: 'process_tag_applied',
                      lead_id: newLead.id,
                      tag_id: t.id,
                      workspace_id: workspaceId,
                    },
                  })
                )
              );
              console.log('✅ Automação de tag_applied disparada para tags do formulário');
            } catch (invokeErr) {
              console.warn('⚠️ Falha ao disparar automação para tags do formulário:', invokeErr);
            }
          }
        }
      }

    } catch (automationError) {
      console.error('❌ Error in automation processing:', automationError);
      // Não falhar a criação do lead por erro de automação
    }

    // Create activity record
    try {
      await supabase
        .from('lead_activities')
        .insert({
          lead_id: newLead.id,
          user_id: newLead.id, // Using lead id as placeholder since we don't have a user context
          activity_type: 'form_submission',
          title: `Formulário ${platform} enviado`,
          description: `Lead criado via formulário ${platform}`,
          metadata: {
            platform,
            form_data: formData,
            custom_fields_mapped: customFieldsData
          }
        });
    } catch (activityError) {
      console.error('⚠️ Error creating activity record:', activityError);
      // Não falhar a criação do lead por erro de atividade
    }

    // Resposta otimizada para Elementor
    console.log('🎉 Webhook completed successfully');
    
    const response = {
      success: true,
      status: 'ok',
      message: 'Lead criado com sucesso',
      data: {
        lead_id: newLead.id,
        name: newLead.name,
        email: newLead.email,
        phone: newLead.phone,
        platform: platform,
        workspace_id: workspaceId,
        mapped_fields: Object.keys(customFieldsData).length,
        timestamp: new Date().toISOString()
      }
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Access-Control-Max-Age': '86400'
        }
      }
    );

  } catch (error) {
    console.error('💥 Critical error in form webhook:', error);
    console.error('📍 Error stack:', error.stack);
    
    // Log detalhado para debug
    console.error('🔍 Error details:', {
      message: error.message,
      name: error.name,
      cause: error.cause
    });
    
    // Resposta de erro otimizada para Elementor
    const errorResponse = {
      success: false,
      status: 'error',
      message: 'Erro interno do servidor',
      error: {
        type: error.name || 'UnknownError',
        message: error.message || 'Erro desconhecido',
        timestamp: new Date().toISOString()
      }
    };
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
});