import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    console.log('🚀 Lead created trigger started');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

const body = await req.json().catch(() => ({} as any));
let record: LeadData | null = (body && body.record) ? body.record as LeadData : null;

// Fallback: aceitar { lead_id, workspace_id } e buscar o lead
if (!record && body?.lead_id) {
  const { data: basicLead, error: basicError } = await supabaseClient
    .from('leads')
    .select(`
      id, name, email, phone, company, value, source, 
      utm_source, utm_medium, utm_campaign, utm_term, utm_content, 
      custom_fields, pipeline_id, stage_id, workspace_id, created_at, currency, notes, status
    `)
    .eq('id', body.lead_id)
    .single();

  if (basicError || !basicLead) {
    console.error('❌ Error fetching lead by id from payload:', basicError);
  } else {
    record = basicLead as LeadData;
  }
}

if (!record) {
  return new Response(
    JSON.stringify({ success: false, message: 'Invalid payload: missing lead record' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

console.log('📥 New lead created:', record.id, record.name);
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

// Disparar automações do tipo 'lead_created' (sem tag)
try {
  console.log('🤖 Calling automation engine for lead_created:', record.id);
  const { data: leadCreatedResult, error: leadCreatedError } = await supabaseClient.functions.invoke('automation-engine', {
    body: {
      action: 'process_lead_created',
      lead_id: record.id,
      workspace_id: record.workspace_id
    }
  });
  if (leadCreatedError) {
    console.error('❌ Error calling automation engine (lead_created):', leadCreatedError);
  } else {
    console.log('✅ Lead created automation result:', leadCreatedResult);
  }
} catch (lcError) {
  console.error('❌ Exception calling lead_created automation:', lcError);
}

// Verificar se o lead tem tags e processar automações baseadas em tags
    const { data: leadTags, error: tagsError } = await supabaseClient
      .from('lead_tag_relations')
      .select('tag_id')
      .eq('lead_id', record.id);

    if (!tagsError && leadTags && leadTags.length > 0) {
      console.log('🏷️ Lead has tags, checking for automations:', leadTags.map(t => t.tag_id));
      
      // Para cada tag, verificar se há automações do tipo 'lead_created_with_tag'
      for (const tagRelation of leadTags) {
        try {
          console.log('🤖 Calling automation engine for tag:', tagRelation.tag_id);
          
          const { data: automationResult, error: automationError } = await supabaseClient.functions.invoke('automation-engine', {
            body: {
              action: 'process_lead_created_with_tag',
              lead_id: record.id,
              tag_id: tagRelation.tag_id,
              workspace_id: record.workspace_id
            }
          });

          if (automationError) {
            console.error('❌ Error calling automation engine:', automationError);
          } else {
            console.log('✅ Automation engine result:', automationResult);
          }
        } catch (automationErr) {
          console.error('❌ Error processing automation for tag:', tagRelation.tag_id, automationErr);
        }
      }
    }

    // Preparar dados para envio ao n8n
    const leadDataForN8n = {
      id: leadWithRelations.id,
      name: leadWithRelations.name,
      email: leadWithRelations.email,
      phone: leadWithRelations.phone,
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
      status: leadWithRelations.status
    };

    console.log('📤 Sending lead to n8n webhook sender...');

    // Chamar a edge function para enviar ao n8n
    const { data: n8nResult, error: n8nError } = await supabaseClient.functions.invoke('n8n-webhook-sender', {
      body: {
        leadData: leadDataForN8n,
        workspaceId: record.workspace_id,
        pipelineId: record.pipeline_id
      }
    });

    if (n8nError) {
      console.error('❌ Error calling n8n webhook sender:', n8nError);
      // Não vamos falhar o trigger se o n8n falhar - é opcional
    } else {
      console.log('✅ Successfully processed n8n webhook:', n8nResult);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Lead processed successfully' }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Error in lead created trigger:', error);
    
    // Para triggers de database, é importante não falhar se possível
    // Retornar sucesso mesmo com erro para não bloquear a criação do lead
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Lead created but webhook failed',
        error: error.message 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});