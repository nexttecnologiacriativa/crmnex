
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
    const { campaignId } = await req.json();

    if (!campaignId) {
      return new Response(
        JSON.stringify({ error: 'Campaign ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar apenas os campos necessários para chamar o automation-engine
    const { data: campaign, error: campaignError } = await supabase
      .from('marketing_campaigns')
      .select('id, workspace_id, api_type')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('❌ Campaign not found:', campaignError);
      return new Response(
        JSON.stringify({ error: 'Campaign not found', details: campaignError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delegar o envio para a mesma lógica do automation-engine
    console.log('🚀 Delegating to automation-engine: process_marketing_campaign');
    const { data: engineResult, error: engineError } = await supabase.functions.invoke('automation-engine', {
      body: {
        action: 'process_marketing_campaign',
        campaign_id: campaign.id,
        api_type: campaign.api_type,
        workspace_id: campaign.workspace_id,
      }
    });

    if (engineError) {
      console.error('❌ automation-engine error:', engineError);
      return new Response(
        JSON.stringify({ error: 'Failed to process campaign', details: engineError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, result: engineResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in campaign send:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send campaign', details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
