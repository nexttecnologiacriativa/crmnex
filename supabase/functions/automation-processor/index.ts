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
    console.log('🤖 Automation processor started');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar itens pendentes na fila com lock para evitar processamento simultâneo
    const { data: queueItems, error: queueError } = await supabase
      .rpc('get_pending_automation_items', { item_limit: 10 });

    if (queueError) {
      console.error('❌ Error fetching queue items:', queueError);
      throw queueError;
    }

    console.log(`📋 Found ${queueItems?.length || 0} pending automation items`);

    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending automation items', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processedCount = 0;

    for (const item of queueItems) {
      try {
        console.log(`🔄 Processing automation item: ${item.id} (${item.trigger_type})`);

        let result = null;

        // Processar diferentes tipos de triggers
        if (item.trigger_type === 'lead_created') {
          result = await supabase.functions.invoke('automation-engine', {
            body: {
              action: 'process_lead_created',
              lead_id: item.lead_id,
              workspace_id: item.workspace_id
            }
          });
        } else if (item.trigger_type === 'tag_applied' || item.trigger_type === 'tag_added') {
          const tagId = item.trigger_data?.tag_id;
          if (tagId) {
            result = await supabase.functions.invoke('automation-engine', {
              body: {
                action: 'process_tag_applied',
                lead_id: item.lead_id,
                tag_id: tagId,
                workspace_id: item.workspace_id
              }
            });
          }
        } else if (item.trigger_type === 'pipeline_stage_changed') {
          const { old_stage_id, new_stage_id, pipeline_id } = item.trigger_data || {};
          if (new_stage_id && pipeline_id) {
            result = await supabase.functions.invoke('automation-engine', {
              body: {
                action: 'process_pipeline_stage_changed',
                lead_id: item.lead_id,
                workspace_id: item.workspace_id,
                old_stage_id,
                new_stage_id,
                pipeline_id
              }
            });
          }
        } else if (item.trigger_type === 'marketing_campaign_send') {
          const { campaign_id, api_type } = item.trigger_data || {};
          if (campaign_id) {
            result = await supabase.functions.invoke('automation-engine', {
              body: {
                action: 'process_marketing_campaign',
                campaign_id,
                api_type,
                workspace_id: item.workspace_id
              }
            });
          }
        }

        if (result?.error) {
          console.error(`❌ Error processing automation:`, result.error);
          
          // Marcar como com erro
          await supabase
            .from('automation_queue')
            .update({ 
              status: 'error',
              error_message: result.error.message || 'Unknown error'
            })
            .eq('id', item.id);
        } else {
          console.log(`✅ Successfully processed automation item: ${item.id}`);
          
          // Marcar como processado com sucesso
          await supabase
            .from('automation_queue')
            .update({ status: 'completed' })
            .eq('id', item.id);
          
          processedCount++;
        }

      } catch (itemError) {
        console.error(`❌ Error processing automation item ${item.id}:`, itemError);
        
        // Marcar como com erro
        await supabase
          .from('automation_queue')
          .update({ 
            status: 'error',
            error_message: (itemError as Error).message || 'Unknown error'
          })
          .eq('id', item.id);
      }
    }

    // Limpar itens antigos da fila (mais de 7 dias)
    await supabase
      .from('automation_queue')
      .delete()
      .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    console.log(`🎯 Automation processing complete: ${processedCount}/${queueItems.length} items processed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        total_items: queueItems.length,
        processed_items: processedCount,
        message: `Processed ${processedCount} automation items`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Automation processor error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process automations', 
        details: (error as Error).message || 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});