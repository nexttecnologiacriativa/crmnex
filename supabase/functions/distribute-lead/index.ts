import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DistributeLeadRequest {
  lead_id: string;
  workspace_id: string;
  pipeline_id?: string;
  source?: string;
  tags?: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { lead_id, workspace_id, pipeline_id, source, tags }: DistributeLeadRequest = await req.json();
    console.log('Distribute lead request:', { lead_id, workspace_id, pipeline_id, source });

    if (!lead_id || !workspace_id) {
      return new Response(
        JSON.stringify({ error: 'lead_id and workspace_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active distribution rules ordered by priority
    const { data: rules, error: rulesError } = await supabase
      .from('lead_distribution_rules')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (rulesError) {
      console.error('Error fetching rules:', rulesError);
      throw rulesError;
    }

    if (!rules || rules.length === 0) {
      console.log('No active distribution rules found');
      return new Response(
        JSON.stringify({ success: false, reason: 'no_rules' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize source for flexible matching
    const normalizeSource = (s: string) => s?.toLowerCase().replace(/[\s_-]+/g, '').replace(/[()]/g, '') || '';

    // Find matching rule
    let matchingRule = null;
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay(); // 0 = Sunday

    console.log('🔍 Looking for matching rule. Source:', source, '-> normalized:', normalizeSource(source || ''));

    for (const rule of rules) {
      console.log(`📋 Checking rule: ${rule.name} (priority: ${rule.priority})`);
      
      // Check pipeline filter
      if (rule.apply_to_pipelines?.length > 0 && pipeline_id) {
        if (!rule.apply_to_pipelines.includes(pipeline_id)) {
          console.log(`  ❌ Pipeline ${pipeline_id} not in allowed pipelines`);
          continue;
        }
      }

      // Check source filter with normalized comparison
      if (rule.apply_to_sources?.length > 0 && source) {
        const normalizedSource = normalizeSource(source);
        const hasMatch = rule.apply_to_sources.some((ruleSource: string) => {
          const normalizedRuleSource = normalizeSource(ruleSource);
          // Check if either contains the other (flexible matching)
          return normalizedSource.includes(normalizedRuleSource) || 
                 normalizedRuleSource.includes(normalizedSource);
        });
        if (!hasMatch) {
          console.log(`  ❌ Source "${source}" not matching allowed sources:`, rule.apply_to_sources);
          continue;
        }
        console.log(`  ✅ Source "${source}" matches`);
      }

      // Check active days
      if (rule.active_days?.length > 0) {
        if (!rule.active_days.includes(currentDay)) continue;
      }

      // Check active hours
      if (rule.active_hours_start && rule.active_hours_end) {
        const [startHour, startMin] = rule.active_hours_start.split(':').map(Number);
        const [endHour, endMin] = rule.active_hours_end.split(':').map(Number);
        const currentTime = currentHour * 60 + currentMinute;
        const startTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;
        if (currentTime < startTime || currentTime > endTime) continue;
      }

      matchingRule = rule;
      break;
    }

    if (!matchingRule) {
      console.log('No matching rule found');
      return new Response(
        JSON.stringify({ success: false, reason: 'no_matching_rule' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Matching rule:', matchingRule.name, matchingRule.distribution_mode);

    // Get rule members
    const { data: members, error: membersError } = await supabase
      .from('lead_distribution_members')
      .select('*')
      .eq('rule_id', matchingRule.id)
      .eq('is_active', true);

    if (membersError || !members || members.length === 0) {
      console.log('No active members found for rule');
      return new Response(
        JSON.stringify({ success: false, reason: 'no_members' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter members by limits
    const availableMembers = [];
    for (const member of members) {
      // Check daily limit
      if (member.max_leads_per_day && member.leads_assigned_today >= member.max_leads_per_day) {
        continue;
      }
      // Check hourly limit
      if (member.max_leads_per_hour && member.leads_assigned_hour >= member.max_leads_per_hour) {
        continue;
      }
      // Check open leads limit
      if (member.max_open_leads) {
        const { count } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspace_id)
          .eq('assigned_to', member.user_id)
          .not('status', 'in', '("won","lost")');
        if (count && count >= member.max_open_leads) {
          continue;
        }
      }
      availableMembers.push(member);
    }

    if (availableMembers.length === 0) {
      console.log('No available members (all at limit)');
      return new Response(
        JSON.stringify({ success: false, reason: 'all_members_at_limit' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let selectedMember = null;
    let reason = '';

    switch (matchingRule.distribution_mode) {
      case 'round_robin': {
        const nextIndex = (matchingRule.last_assigned_index + 1) % availableMembers.length;
        selectedMember = availableMembers[nextIndex];
        reason = `Round robin - índice ${nextIndex}`;
        // Update last assigned index
        await supabase
          .from('lead_distribution_rules')
          .update({ last_assigned_index: nextIndex })
          .eq('id', matchingRule.id);
        break;
      }

      case 'percentage': {
        const random = Math.random() * 100;
        let accumulated = 0;
        for (const member of availableMembers) {
          accumulated += member.percentage;
          if (random <= accumulated) {
            selectedMember = member;
            reason = `Porcentagem - ${member.percentage}%`;
            break;
          }
        }
        if (!selectedMember) {
          selectedMember = availableMembers[availableMembers.length - 1];
          reason = 'Porcentagem - fallback';
        }
        break;
      }

      case 'least_loaded': {
        let minLeads = Infinity;
        for (const member of availableMembers) {
          const { count } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', workspace_id)
            .eq('assigned_to', member.user_id)
            .not('status', 'in', '("won","lost")');
          const leadCount = count || 0;
          if (leadCount < minLeads) {
            minLeads = leadCount;
            selectedMember = member;
          }
        }
        reason = `Menor carga - ${minLeads} leads`;
        break;
      }

      case 'fixed': {
        if (matchingRule.fixed_user_id) {
          selectedMember = availableMembers.find(m => m.user_id === matchingRule.fixed_user_id);
          reason = 'Fixo';
        }
        break;
      }

      case 'weighted_random': {
        const totalWeight = availableMembers.reduce((sum, m) => sum + (m.weight || 1), 0);
        let random = Math.random() * totalWeight;
        for (const member of availableMembers) {
          random -= (member.weight || 1);
          if (random <= 0) {
            selectedMember = member;
            reason = `Peso aleatório - peso ${member.weight}`;
            break;
          }
        }
        break;
      }
    }

    if (!selectedMember) {
      console.log('Could not select member');
      return new Response(
        JSON.stringify({ success: false, reason: 'selection_failed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Selected member:', selectedMember.user_id, reason);

    // Update lead with assigned user
    const { error: updateError } = await supabase
      .from('leads')
      .update({ assigned_to: selectedMember.user_id })
      .eq('id', lead_id);

    if (updateError) {
      console.error('Error updating lead:', updateError);
      throw updateError;
    }

    // Update member counters
    await supabase
      .from('lead_distribution_members')
      .update({
        leads_assigned_today: selectedMember.leads_assigned_today + 1,
        leads_assigned_hour: selectedMember.leads_assigned_hour + 1,
        last_assignment_at: new Date().toISOString(),
      })
      .eq('id', selectedMember.id);

    // Log distribution
    await supabase
      .from('lead_distribution_logs')
      .insert({
        workspace_id,
        lead_id,
        rule_id: matchingRule.id,
        assigned_to: selectedMember.user_id,
        source,
        pipeline_id,
        distribution_mode: matchingRule.distribution_mode,
        reason,
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        assigned_to: selectedMember.user_id,
        rule: matchingRule.name,
        reason 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Distribution error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
