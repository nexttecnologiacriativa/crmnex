import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MergeRequest {
  sourceLeadId: string;
  targetLeadId: string;
  workspaceId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { sourceLeadId, targetLeadId, workspaceId }: MergeRequest = await req.json();

    console.log(`[merge-leads] Starting merge: source=${sourceLeadId} -> target=${targetLeadId}`);

    if (!sourceLeadId || !targetLeadId || !workspaceId) {
      return new Response(
        JSON.stringify({ error: 'sourceLeadId, targetLeadId and workspaceId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (sourceLeadId === targetLeadId) {
      return new Response(
        JSON.stringify({ error: 'Source and target leads must be different' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      console.error('[merge-leads] Source lead not found:', sourceError);
      return new Response(
        JSON.stringify({ error: 'Source lead not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (targetError || !targetLead) {
      console.error('[merge-leads] Target lead not found:', targetError);
      return new Response(
        JSON.stringify({ error: 'Target lead not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Merge lead data (fill empty fields in target with source values)
    const mergedData: Record<string, any> = {};
    
    // Fields to potentially fill from source
    const fillableFields = ['email', 'company', 'position', 'source', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    
    for (const field of fillableFields) {
      if (!targetLead[field] && sourceLead[field]) {
        mergedData[field] = sourceLead[field];
      }
    }

    // Merge notes (concatenate)
    if (sourceLead.notes && targetLead.notes) {
      mergedData.notes = `${targetLead.notes}\n\n--- Notas do lead mesclado ---\n${sourceLead.notes}`;
    } else if (sourceLead.notes && !targetLead.notes) {
      mergedData.notes = sourceLead.notes;
    }

    // Merge value (keep higher or sum based on preference - keeping higher for now)
    if (sourceLead.value && targetLead.value) {
      mergedData.value = Math.max(sourceLead.value, targetLead.value);
    } else if (sourceLead.value && !targetLead.value) {
      mergedData.value = sourceLead.value;
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
        console.error('[merge-leads] Error updating target lead:', updateError);
        throw updateError;
      }
      console.log('[merge-leads] Updated target lead with merged data');
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
      const { error: tagsError } = await supabase
        .from('lead_tag_relations')
        .insert(newTags.map(t => ({ lead_id: targetLeadId, tag_id: t.tag_id })));

      if (tagsError) {
        console.error('[merge-leads] Error transferring tags:', tagsError);
      } else {
        console.log(`[merge-leads] Transferred ${newTags.length} tags`);
      }
    }

    // Delete source tag relations before deleting lead
    await supabase.from('lead_tag_relations').delete().eq('lead_id', sourceLeadId);

    // Transfer activities
    const { error: activitiesError } = await supabase
      .from('lead_activities')
      .update({ lead_id: targetLeadId })
      .eq('lead_id', sourceLeadId);

    if (activitiesError) {
      console.error('[merge-leads] Error transferring activities:', activitiesError);
    } else {
      console.log('[merge-leads] Transferred activities');
    }

    // Transfer tasks
    const { error: tasksError } = await supabase
      .from('tasks')
      .update({ lead_id: targetLeadId })
      .eq('lead_id', sourceLeadId);

    if (tasksError) {
      console.error('[merge-leads] Error transferring tasks:', tasksError);
    } else {
      console.log('[merge-leads] Transferred tasks');
    }

    // Transfer appointments
    const { error: appointmentsError } = await supabase
      .from('lead_appointments')
      .update({ lead_id: targetLeadId })
      .eq('lead_id', sourceLeadId);

    if (appointmentsError) {
      console.error('[merge-leads] Error transferring appointments:', appointmentsError);
    } else {
      console.log('[merge-leads] Transferred appointments');
    }

    // Transfer WhatsApp conversations
    const { error: conversationsError } = await supabase
      .from('whatsapp_conversations')
      .update({ lead_id: targetLeadId })
      .eq('lead_id', sourceLeadId);

    if (conversationsError) {
      console.error('[merge-leads] Error transferring conversations:', conversationsError);
    } else {
      console.log('[merge-leads] Transferred WhatsApp conversations');
    }

    // Transfer pipeline relations (non-primary only, delete duplicates)
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
      const { error: relationsError } = await supabase
        .from('lead_pipeline_relations')
        .insert(newRelations.map(r => ({
          lead_id: targetLeadId,
          pipeline_id: r.pipeline_id,
          stage_id: r.stage_id,
          is_primary: false
        })));

      if (relationsError) {
        console.error('[merge-leads] Error transferring pipeline relations:', relationsError);
      } else {
        console.log(`[merge-leads] Transferred ${newRelations.length} pipeline relations`);
      }
    }

    // Delete source pipeline relations
    await supabase.from('lead_pipeline_relations').delete().eq('lead_id', sourceLeadId);

    // Create merge activity
    const { error: activityError } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: targetLeadId,
        user_id: targetLead.assigned_to || sourceLead.assigned_to || targetLead.workspace_id,
        activity_type: 'lead_merged',
        title: 'Lead mesclado',
        description: `Lead "${sourceLead.name}" foi mesclado a este lead`,
        metadata: {
          source_lead_id: sourceLeadId,
          source_lead_name: sourceLead.name,
          source_lead_phone: sourceLead.phone,
          merged_at: new Date().toISOString()
        }
      });

    if (activityError) {
      console.error('[merge-leads] Error creating merge activity:', activityError);
    }

    // Finally, delete the source lead
    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .eq('id', sourceLeadId);

    if (deleteError) {
      console.error('[merge-leads] Error deleting source lead:', deleteError);
      throw deleteError;
    }

    console.log('[merge-leads] Merge completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Leads mesclados com sucesso',
        targetLeadId,
        mergedData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[merge-leads] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
