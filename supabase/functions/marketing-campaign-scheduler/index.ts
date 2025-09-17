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
    console.log('🚀 Marketing Campaign Scheduler started');
    const startTime = Date.now();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Log execution start
    const logEntry = {
      scheduler_name: 'marketing-campaign-scheduler',
      execution_time: new Date().toISOString(),
      campaigns_found: 0,
      campaigns_processed: 0,
      campaigns_successful: 0,
      campaigns_failed: 0,
      execution_duration_ms: 0,
      status: 'success',
      error_message: null
    };

    try {
      // Buscar campanhas agendadas que devem ser enviadas agora
      const { data: campaigns, error: campaignsError } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('status', 'scheduled')
        .lte('scheduled_at', new Date().toISOString());

      if (campaignsError) {
        console.error('❌ Error fetching campaigns:', campaignsError);
        logEntry.status = 'error';
        logEntry.error_message = campaignsError.message;
        throw campaignsError;
      }

      logEntry.campaigns_found = campaigns?.length || 0;
      console.log(`📋 Found ${logEntry.campaigns_found} scheduled campaigns`);

      if (!campaigns || campaigns.length === 0) {
        console.log('ℹ️ No campaigns scheduled for sending');
        logEntry.execution_duration_ms = Date.now() - startTime;
        
        // Log execution
        await supabase.from('scheduler_logs').insert([logEntry]);
        
        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'No campaigns scheduled for sending',
            campaigns_found: 0,
            campaigns_processed: 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const results = [];

      // Processar cada campanha
      for (const campaign of campaigns) {
        try {
          console.log(`📧 Processing campaign: ${campaign.name} (${campaign.id})`);
          
          // Atualizar status para 'sending'
          await supabase
            .from('marketing_campaigns')
            .update({ status: 'sending' })
            .eq('id', campaign.id);

          // Chamar a função de envio de campanha
          const { data: sendResult, error: sendError } = await supabase.functions.invoke('marketing-campaign-send', {
            body: { campaignId: campaign.id }
          });

          if (sendError) {
            console.error(`❌ Error sending campaign ${campaign.id}:`, sendError);
            results.push({
              campaign_id: campaign.id,
              campaign_name: campaign.name,
              status: 'failed',
              error: sendError.message
            });
            logEntry.campaigns_failed++;
          } else {
            console.log(`✅ Campaign ${campaign.id} sent successfully`);
            results.push({
              campaign_id: campaign.id,
              campaign_name: campaign.name,
              status: 'success',
              result: sendResult
            });
            logEntry.campaigns_successful++;
          }

          logEntry.campaigns_processed++;

        } catch (campaignError) {
          console.error(`❌ Error processing campaign ${campaign.id}:`, campaignError);
          results.push({
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            status: 'failed',
            error: campaignError.message
          });
          logEntry.campaigns_failed++;
          logEntry.campaigns_processed++;
        }
      }

      logEntry.execution_duration_ms = Date.now() - startTime;
      
      // Log execution results
      await supabase.from('scheduler_logs').insert([logEntry]);

      console.log(`🎯 Scheduler execution complete: ${logEntry.campaigns_successful}/${logEntry.campaigns_processed} successful, duration: ${logEntry.execution_duration_ms}ms`);

      return new Response(
        JSON.stringify({ 
          success: true,
          campaigns_found: logEntry.campaigns_found,
          campaigns_processed: logEntry.campaigns_processed,
          campaigns_successful: logEntry.campaigns_successful,
          campaigns_failed: logEntry.campaigns_failed,
          execution_duration_ms: logEntry.execution_duration_ms,
          results: results
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      logEntry.status = 'error';
      logEntry.error_message = error.message;
      logEntry.execution_duration_ms = Date.now() - startTime;
      
      // Log critical error
      await supabase.from('scheduler_logs').insert([logEntry]);
      throw error;
    }

  } catch (error) {
    console.error('❌ Marketing Campaign Scheduler error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to execute marketing campaign scheduler', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});