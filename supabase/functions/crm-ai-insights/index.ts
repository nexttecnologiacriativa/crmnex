import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body to check for force_refresh and workspace_id parameters
    let forceRefresh = false;
    let requestedWorkspaceId: string | null = null;
    
    try {
      if (req.method === 'POST') {
        const body = await req.json();
        forceRefresh = body?.force_refresh === true;
        requestedWorkspaceId = body?.workspace_id || null;
      }
    } catch (e) {
      // If no body or invalid JSON, continue without force refresh
      console.log('No request body or invalid JSON, continuing...');
    }

    console.log('Force refresh requested:', forceRefresh);
    console.log('Requested workspace ID:', requestedWorkspaceId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Service role client for cache writes/deletes (bypass RLS)
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user session
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User authenticated:', user.id);

    // Get user's workspaces (support multiple workspaces)
    const { data: workspaceMembers } = await supabaseClient
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id);

    if (!workspaceMembers || workspaceMembers.length === 0) {
      return new Response(JSON.stringify({ error: 'Workspace not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine which workspace to use
    // Known superadmin workspace ID to filter out
    const superadminWorkspaceId = 'a0000000-0000-0000-0000-000000000001';
    let workspaceId: string;

    if (requestedWorkspaceId) {
      // Validate that the user has access to the requested workspace
      const hasAccess = workspaceMembers.some(m => m.workspace_id === requestedWorkspaceId);
      if (!hasAccess) {
        console.error('User does not have access to workspace:', requestedWorkspaceId);
        return new Response(JSON.stringify({ error: 'Access denied to workspace' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      workspaceId = requestedWorkspaceId;
    } else {
      // Filter out superadmin workspace and use the first regular workspace
      const regularWorkspaces = workspaceMembers.filter(m => m.workspace_id !== superadminWorkspaceId);
      workspaceId = regularWorkspaces.length > 0 
        ? regularWorkspaces[0].workspace_id 
        : workspaceMembers[0].workspace_id;
    }
    
    console.log('Using workspace ID:', workspaceId);

    // Check for cached insights first (skip if force refresh)
    if (!forceRefresh) {
      const { data: cachedInsights } = await supabaseClient
        .from('ai_insights_cache')
        .select('*')
        .eq('workspace_id', workspaceId)
        .gt('expires_at', new Date().toISOString())
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cachedInsights) {
        console.log('Returning cached insights (created at:', cachedInsights.generated_at, ')');
        return new Response(JSON.stringify(cachedInsights.insights_data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      console.log('Force refresh requested - clearing existing cache');
      // Clear existing cache when force refresh is requested
      const { error: cacheDeleteError } = await serviceClient
        .from('ai_insights_cache')
        .delete()
        .eq('workspace_id', workspaceId);
      if (cacheDeleteError) {
        console.error('Error deleting cache:', cacheDeleteError);
      } else {
        console.log('Existing cache cleared successfully');
      }
    }

    console.log('No valid cache found or force refresh requested, generating new insights');

    // Get OpenAI API key from Supabase secrets (global configuration)
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not found in Supabase secrets');
      return new Response(JSON.stringify({
        error: 'OpenAI API key not configured',
        message: 'A API key da OpenAI não está configurada. Entre em contato com o administrador do sistema.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get workspace settings to get selected pipelines
    const { data: settings } = await supabaseClient
      .from('workspace_settings')
      .select('ai_insights_pipeline_ids')
      .eq('workspace_id', workspaceId)
      .single();

    console.log('OpenAI API key found in Supabase secrets');
    console.log('Selected pipelines:', settings?.ai_insights_pipeline_ids);

    // Calculate date range - focus on last 30 days for insights
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days
    
    // For comparison, use previous 30 days
    const prevPeriodStart = new Date();
    prevPeriodStart.setDate(prevPeriodStart.getDate() - 60);
    const prevPeriodEnd = new Date();
    prevPeriodEnd.setDate(prevPeriodEnd.getDate() - 30);

    console.log('Analyzing CRM data from last 30 days:', startDate.toISOString(), 'to', endDate.toISOString());

    // Collect leads data for analysis (focus on leads and conversions only)
    const [leadsResponse, pipelineResponse] = await Promise.all([
      // Leads data (current vs previous period)
      supabaseClient
        .from('leads')
        .select(`
          id, 
          created_at, 
          value, 
          status, 
          utm_source, 
          utm_medium, 
          utm_campaign, 
          pipeline_tag,
          stage_id,
          pipeline_stages!inner(name, position)
        `)
        .eq('workspace_id', workspaceId)
        .gte('created_at', startDate.toISOString()),

      // Pipeline stages for conversion analysis - filter by selected pipelines if configured
      (() => {
        let pipelineQuery = supabaseClient
          .from('pipeline_stages')
          .select('id, name, position, pipelines!inner(workspace_id)')
          .eq('pipelines.workspace_id', workspaceId)
          .order('position');

        // Apply pipeline filter if specific pipelines are selected
        if (settings?.ai_insights_pipeline_ids && settings.ai_insights_pipeline_ids.length > 0) {
          pipelineQuery = pipelineQuery.in('pipelines.id', settings.ai_insights_pipeline_ids);
        }

        return pipelineQuery;
      })()
    ]);

    if (leadsResponse.error || pipelineResponse.error) {
      console.error('Data fetch error:', leadsResponse.error || pipelineResponse.error);
      return new Response(JSON.stringify({ error: 'Failed to fetch CRM data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const leads = leadsResponse.data || [];
    const pipelineStages = pipelineResponse.data || [];

    console.log(`Fetched ${leads.length} leads from last 30 days (filtered by selected pipelines), ${pipelineStages.length} pipeline stages`);

    // Process data for insights - current 30 days vs previous 30 days
    const currentPeriodLeads = leads; // Leads from last 30 days
    const previousPeriodLeads = leads.filter(l => 
      new Date(l.created_at) >= prevPeriodStart && new Date(l.created_at) < prevPeriodEnd
    );

    // Identify negotiation and closed stages
    const sortedStages = pipelineStages.sort((a, b) => a.position - b.position);
    const negotiationStages = sortedStages.filter(s => 
      s.name.toLowerCase().includes('negociação') || 
      s.name.toLowerCase().includes('negociacao') ||
      s.name.toLowerCase().includes('proposta') ||
      s.position >= sortedStages.length - 3 // Last 3 stages are likely negotiation/closing
    );
    const closedStages = sortedStages.slice(-2); // Last 2 stages considered as "closed"
    
    // Calculate negotiation metrics
    const negotiationStageIds = negotiationStages.map(s => s.id);
    const closedLeadsIds = closedStages.map(s => s.id);
    
    // Calculate metrics for current and previous periods
    const currentLeadsInNegotiation = currentPeriodLeads.filter(l => negotiationStageIds.includes(l.stage_id));
    const currentClosedLeads = currentPeriodLeads.filter(l => closedStages.some(s => s.id === l.stage_id));
    const currentOpportunities = currentPeriodLeads.filter(l => l.value && l.value > 0);
    
    const previousClosedLeads = previousPeriodLeads.filter(l => closedStages.some(s => s.id === l.stage_id));
    const previousOpportunities = previousPeriodLeads.filter(l => l.value && l.value > 0);

    // Calculate time in negotiation for leads currently in negotiation
    const now = new Date();
    const leadsWithNegotiationTime = currentLeadsInNegotiation.map(lead => {
      const stageUpdatedAt = (lead as any).pipeline_stage_updated_at ? new Date((lead as any).pipeline_stage_updated_at) : new Date(lead.created_at);
      const daysInStage = Math.floor((now.getTime() - stageUpdatedAt.getTime()) / (1000 * 60 * 60 * 24));
      return { ...lead, daysInNegotiation: daysInStage };
    });

    const avgDaysInNegotiation = leadsWithNegotiationTime.length > 0 
      ? Math.round(leadsWithNegotiationTime.reduce((sum, l) => sum + l.daysInNegotiation, 0) / leadsWithNegotiationTime.length)
      : 0;
    
    const stuckLeads = leadsWithNegotiationTime.filter(l => l.daysInNegotiation > 7); // More than 7 days

    // Calculate comprehensive metrics from last 30 days
    const metrics = {
      leads: {
        total: currentPeriodLeads.length,
        current: currentPeriodLeads.length,
        previous: previousPeriodLeads.length,
        growth: previousPeriodLeads.length > 0 
          ? ((currentPeriodLeads.length - previousPeriodLeads.length) / previousPeriodLeads.length * 100).toFixed(1)
          : currentPeriodLeads.length > 0 ? 100 : 0,
      },
      conversion: {
        totalOpportunities: currentOpportunities.length,
        closedDeals: currentClosedLeads.length,
        conversionRate: currentPeriodLeads.length > 0 
          ? (currentClosedLeads.length / currentPeriodLeads.length * 100).toFixed(1) 
          : 0,
        previousClosedDeals: previousClosedLeads.length,
        previousConversionRate: previousPeriodLeads.length > 0 
          ? (previousClosedLeads.length / previousPeriodLeads.length * 100).toFixed(1) 
          : 0,
      },
      negotiation: {
        leadsInNegotiation: currentLeadsInNegotiation.length,
        avgDaysInNegotiation,
        stuckLeads: stuckLeads.length,
        stuckLeadsValue: stuckLeads.reduce((sum, l) => sum + (l.value || 0), 0),
        negotiationStages: negotiationStages.map(s => s.name).join(', ')
      },
      revenue: {
        totalOpportunitiesValue: currentOpportunities.reduce((sum, l) => sum + (l.value || 0), 0),
        totalClosedValue: currentClosedLeads.reduce((sum, l) => sum + (l.value || 0), 0),
        previousClosedValue: previousClosedLeads.reduce((sum, l) => sum + (l.value || 0), 0),
        avgDealSize: currentClosedLeads.length > 0 
          ? (currentClosedLeads.reduce((sum, l) => sum + (l.value || 0), 0) / currentClosedLeads.length).toFixed(2)
          : 0
      },
      utmSources: currentPeriodLeads.reduce((acc, lead) => {
        const source = lead.utm_source || 'Direto';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      stageDistribution: currentPeriodLeads.reduce((acc, lead) => {
        const stageName = (lead.pipeline_stages as any)?.[0]?.name || 'Sem estágio';
        acc[stageName] = (acc[stageName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    console.log('Metrics calculated:', metrics);

    // Create context for OpenAI
    const contextData = {
      period: "últimos 30 dias",
      dateRange: `${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`,
      metrics,
      topUTMSources: Object.entries(metrics.utmSources)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5),
      pipelineStages: pipelineStages.map(s => `${s.name} (posição ${s.position})`).join(', ')
    };

    // Call OpenAI API for insights
    const prompt = `
Analise os dados do CRM dos ${contextData.period} (${contextData.dateRange}) e forneça insights específicos sobre performance de leads e conversão:

**DADOS DOS ÚLTIMOS 30 DIAS:**
- Total de leads: ${metrics.leads.current}
- Período anterior (30 dias): ${metrics.leads.previous}
- Crescimento: ${metrics.leads.growth}%
- Pipelines analisados: ${settings?.ai_insights_pipeline_ids && settings.ai_insights_pipeline_ids.length > 0 ? `${settings.ai_insights_pipeline_ids.length} selecionados` : 'Todos os pipelines'}

**CONVERSÃO:**
- Oportunidades com valor: ${metrics.conversion.totalOpportunities}
- Negócios fechados: ${metrics.conversion.closedDeals}
- Taxa de conversão atual: ${metrics.conversion.conversionRate}%
- Taxa conversão período anterior: ${metrics.conversion.previousConversionRate}%

**PERFORMANCE FINANCEIRA:**
- Valor total em oportunidades: R$ ${metrics.revenue.totalOpportunitiesValue.toLocaleString('pt-BR')}
- Valor total fechado: R$ ${metrics.revenue.totalClosedValue.toLocaleString('pt-BR')}
- Valor fechado período anterior: R$ ${metrics.revenue.previousClosedValue.toLocaleString('pt-BR')}
- Ticket médio: R$ ${metrics.revenue.avgDealSize}

**SITUAÇÃO ATUAL DO PIPELINE:**
- Leads em negociação: ${metrics.negotiation.leadsInNegotiation}
- Tempo médio em negociação: ${metrics.negotiation.avgDaysInNegotiation} dias
- Leads parados (>7 dias): ${metrics.negotiation.stuckLeads}
- Valor em leads parados: R$ ${metrics.negotiation.stuckLeadsValue.toLocaleString('pt-BR')}

**PRINCIPAIS FONTES (últimos 30 dias):**
${contextData.topUTMSources.map(([source, count]) => `- ${source}: ${count} leads`).join('\n')}

**DISTRIBUIÇÃO NO PIPELINE:**
${Object.entries(metrics.stageDistribution).map(([stage, count]) => `- ${stage}: ${count} leads`).join('\n')}

Forneça análise focada nos últimos 30 dias com comparação ao período anterior e oportunidades de melhoria.
`;

    console.log('Calling OpenAI API...');

    let openaiResponse;
    let openaiData;
    
    try {
      console.log('Making request to OpenAI API...');
      openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Você é um analista de CRM especializado. Analise os dados fornecidos e gere insights valiosos em português brasileiro focados nos últimos 30 dias.
              
              Estruture sua resposta EXATAMENTE neste formato, usando estes títulos:
              
              Insights sobre Performance de Leads e Conversão
              Análise da performance dos últimos 30 dias, taxas de conversão e tendências comparando com o período anterior. Use dados específicos.
              
              Recomendações Acionáveis
              Sugestões práticas e específicas que podem ser implementadas imediatamente para melhorar os resultados.
              
              Alerta ou Oportunidade Identificada
              Alertas sobre leads parados, oportunidades de melhoria ou pontos de atenção importantes baseados nos dados recentes.
              
              IMPORTANTE:
              - NÃO use markdown (**, *__, ###, ---, |)
              - NÃO use numeração (1., 2., 3.)
              - NÃO use símbolos especiais ou formatação
              - Use apenas os títulos especificados
              - Seja conciso e direto
              - Use dados específicos dos metrics fornecidos
              - Foque nos últimos 30 dias e comparação com período anterior`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      console.log('OpenAI API response status:', openaiResponse.status);
      
      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error('OpenAI API error status:', openaiResponse.status);
        console.error('OpenAI API error details:', errorText);
        return new Response(JSON.stringify({
          error: 'Failed to generate insights',
          details: `OpenAI API error (${openaiResponse.status}): ${errorText}`,
          statusCode: openaiResponse.status
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Parsing OpenAI response...');
      openaiData = await openaiResponse.json();
      console.log('OpenAI response parsed successfully');
      
      if (!openaiData.choices || !openaiData.choices[0] || !openaiData.choices[0].message) {
        console.error('Invalid OpenAI response structure:', JSON.stringify(openaiData));
        return new Response(JSON.stringify({
          error: 'Invalid response from AI service',
          details: 'OpenAI response structure is invalid'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const insights = openaiData.choices[0].message.content;
      
      console.log('Insights generated successfully');

      const responseData = {
        insights,
        metrics: {
          leads: metrics.leads.current,
          leadsGrowth: metrics.leads.growth,
          opportunities: metrics.conversion.totalOpportunities,
          conversionRate: metrics.conversion.conversionRate,
          closedDeals: metrics.conversion.closedDeals,
          closedValue: metrics.revenue.totalClosedValue,
          negotiationLeads: metrics.negotiation.leadsInNegotiation,
          avgNegotiationDays: metrics.negotiation.avgDaysInNegotiation,
          stuckLeads: metrics.negotiation.stuckLeads
        },
        lastUpdated: new Date().toISOString()
      };

      // Cache the insights for 6 hours
      const { error: cacheInsertError } = await serviceClient
        .from('ai_insights_cache')
        .insert({
          workspace_id: workspaceId,
          insights_data: responseData,
          expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // 6 hours from now
        });
      if (cacheInsertError) {
        console.error('Error caching insights:', cacheInsertError);
      } else {
        console.log('Insights cached successfully');
      }

      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (openaiError) {
      console.error('OpenAI API fetch error:', openaiError);
      return new Response(JSON.stringify({
        error: 'Failed to connect to AI service',
        details: (openaiError as Error).message || 'Unknown error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Critical error in crm-ai-insights function:', error);
    console.error('Error stack:', (error as Error).stack || 'No stack');
    console.error('Error name:', (error as Error).name || 'Unknown');
    console.error('Error message:', (error as Error).message || 'Unknown');
    
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: (error as Error).message || 'Unknown error',
      type: (error as Error).name || 'Unknown',
      details: `Function crashed: ${(error as Error).message || 'Unknown error'}`
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});