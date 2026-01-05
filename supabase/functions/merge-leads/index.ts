import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MergeRequest {
  // Single merge mode
  sourceLeadId?: string;
  targetLeadId?: string;
  // Bulk merge mode
  bulkMerge?: boolean;
  groups?: Array<{ normalizedPhone: string; leadIds: string[] }>;
  workspaceId: string;
}

// Helper function to merge a single pair of leads
async function mergeSingleLead(
  supabase: ReturnType<typeof createClient>,
  sourceLeadId: string,
  targetLeadId: string,
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  console.log(`[merge-leads] Merging source=${sourceLeadId} -> target=${targetLeadId}`);

  // Fetch both leads
  const { data: sourceLead, error: sourceError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', sourceLeadId)
    .single();

  const { data: targetLead, error: targetError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', targetLeadId)
    .single();

  if (sourceError || !sourceLead) {
    return { success: false, error: 'Source lead not found' };
  }

  if (targetError || !targetLead) {
    return { success: false, error: 'Target lead not found' };
  }

  // Merge lead data (fill empty fields in target with source values)
  const mergedData: Record<string, any> = {};
  
  const fillableFields = ['email', 'company', 'position', 'source', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  
  for (const field of fillableFields) {
    if (!targetLead[field] && sourceLead[field]) {
      mergedData[field] = sourceLead[field];
    }
  }

  // Merge notes
  if (sourceLead.notes && targetLead.notes) {
    mergedData.notes = `${targetLead.notes}\n\n--- Notas do lead mesclado ---\n${sourceLead.notes}`;
  } else if (sourceLead.notes && !targetLead.notes) {
    mergedData.notes = sourceLead.notes;
  }

  // Merge value (sum values)
  if (sourceLead.value || targetLead.value) {
    mergedData.value = (targetLead.value || 0) + (sourceLead.value || 0);
  }

  // Deep merge custom_fields
  const sourceCustomFields = sourceLead.custom_fields || {};
  const targetCustomFields = targetLead.custom_fields || {};
  mergedData.custom_fields = { ...sourceCustomFields, ...targetCustomFields };

  // Update target lead with merged data
  if (Object.keys(mergedData).length > 0) {
    const { error: updateError } = await supabase
      .from('leads')
      .update(mergedData)
      .eq('id', targetLeadId);

    if (updateError) {
      return { success: false, error: `Failed to update target lead: ${updateError.message}` };
    }
  }

  // Transfer tags (avoiding duplicates)
  const { data: sourceTags } = await supabase
    .from('lead_tag_relations')
    .select('tag_id')
    .eq('lead_id', sourceLeadId);

  const { data: targetTags } = await supabase
    .from('lead_tag_relations')
    .select('tag_id')
    .eq('lead_id', targetLeadId);

  const existingTagIds = new Set((targetTags || []).map(t => t.tag_id));
  const newTags = (sourceTags || []).filter(t => !existingTagIds.has(t.tag_id));

  if (newTags.length > 0) {
    await supabase
      .from('lead_tag_relations')
      .insert(newTags.map(t => ({ lead_id: targetLeadId, tag_id: t.tag_id })));
  }

  // Delete source tag relations
  await supabase.from('lead_tag_relations').delete().eq('lead_id', sourceLeadId);

  // Transfer activities
  await supabase
    .from('lead_activities')
    .update({ lead_id: targetLeadId })
    .eq('lead_id', sourceLeadId);

  // Transfer tasks
  await supabase
    .from('tasks')
    .update({ lead_id: targetLeadId })
    .eq('lead_id', sourceLeadId);

  // Transfer appointments
  await supabase
    .from('lead_appointments')
    .update({ lead_id: targetLeadId })
    .eq('lead_id', sourceLeadId);

  // Transfer WhatsApp conversations
  await supabase
    .from('whatsapp_conversations')
    .update({ lead_id: targetLeadId })
    .eq('lead_id', sourceLeadId);

  // Transfer pipeline relations
  const { data: sourceRelations } = await supabase
    .from('lead_pipeline_relations')
    .select('pipeline_id, stage_id')
    .eq('lead_id', sourceLeadId);

  const { data: targetRelations } = await supabase
    .from('lead_pipeline_relations')
    .select('pipeline_id')
    .eq('lead_id', targetLeadId);

  const existingPipelineIds = new Set((targetRelations || []).map(r => r.pipeline_id));
  const newRelations = (sourceRelations || []).filter(r => !existingPipelineIds.has(r.pipeline_id));

  if (newRelations.length > 0) {
    await supabase
      .from('lead_pipeline_relations')
      .insert(newRelations.map(r => ({
        lead_id: targetLeadId,
        pipeline_id: r.pipeline_id,
        stage_id: r.stage_id,
        is_primary: false
      })));
  }

  // Delete source pipeline relations
  await supabase.from('lead_pipeline_relations').delete().eq('lead_id', sourceLeadId);

  // Delete source lead
  const { error: deleteError } = await supabase
    .from('leads')
    .delete()
    .eq('id', sourceLeadId);

  if (deleteError) {
    return { success: false, error: `Failed to delete source lead: ${deleteError.message}` };
  }

  return { success: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const request: MergeRequest = await req.json();
    const { bulkMerge, groups, sourceLeadId, targetLeadId, workspaceId } = request;

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing workspaceId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Bulk merge mode
    if (bulkMerge && groups && groups.length > 0) {
      console.log(`[merge-leads] Starting bulk merge for ${groups.length} groups`);
      
      let groupsProcessed = 0;
      let leadsMerged = 0;
      const errors: string[] = [];

      for (const group of groups) {
        if (group.leadIds.length < 2) continue;

        // Fetch leads to find the most recent one
        const { data: leads, error: fetchError } = await supabase
          .from('leads')
          .select('id, created_at')
          .in('id', group.leadIds)
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false });

        if (fetchError || !leads || leads.length < 2) {
          errors.push(`Group ${group.normalizedPhone}: Failed to fetch leads`);
          continue;
        }

        // Most recent lead is the target
        const targetId = leads[0].id;
        const sourceIds = leads.slice(1).map(l => l.id);

        // Merge each source into target
        for (const sourceId of sourceIds) {
          const result = await mergeSingleLead(supabase, sourceId, targetId, workspaceId);
          if (result.success) {
            leadsMerged++;
          } else {
            errors.push(`Failed to merge ${sourceId}: ${result.error}`);
          }
        }

        groupsProcessed++;
      }

      console.log(`[merge-leads] Bulk merge complete: ${groupsProcessed} groups, ${leadsMerged} leads merged`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          groupsProcessed, 
          leadsMerged,
          errors: errors.length > 0 ? errors : undefined
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Single merge mode
    if (!sourceLeadId || !targetLeadId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields for single merge' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (sourceLeadId === targetLeadId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Source and target leads must be different' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await mergeSingleLead(supabase, sourceLeadId, targetLeadId, workspaceId);

    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[merge-leads] Single merge completed: ${sourceLeadId} -> ${targetLeadId}`);

    return new Response(
      JSON.stringify({ success: true, targetLeadId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[merge-leads] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
