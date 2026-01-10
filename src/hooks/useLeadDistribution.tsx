import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWorkspace } from '@/hooks/useWorkspace';

export type DistributionMode = 'round_robin' | 'percentage' | 'least_loaded' | 'fixed' | 'weighted_random';

export interface DistributionRule {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  distribution_mode: DistributionMode;
  apply_to_pipelines: string[];
  apply_to_sources: string[];
  apply_to_tags: string[];
  exclude_tags: string[];
  active_hours_start: string | null;
  active_hours_end: string | null;
  active_days: number[];
  is_active: boolean;
  priority: number;
  last_assigned_index: number;
  fixed_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DistributionMember {
  id: string;
  rule_id: string;
  user_id: string;
  percentage: number;
  weight: number;
  is_active: boolean;
  max_leads_per_day: number | null;
  max_leads_per_hour: number | null;
  max_open_leads: number | null;
  leads_assigned_today: number;
  leads_assigned_hour: number;
  last_assignment_at: string | null;
  created_at: string;
  profiles?: {
    email: string;
    full_name: string | null;
  };
}

export interface DistributionLog {
  id: string;
  workspace_id: string;
  lead_id: string;
  rule_id: string | null;
  assigned_to: string | null;
  source: string | null;
  pipeline_id: string | null;
  distribution_mode: string | null;
  reason: string | null;
  created_at: string;
}

export interface CreateRuleData {
  name: string;
  description?: string | null;
  distribution_mode: DistributionMode;
  apply_to_pipelines?: string[];
  apply_to_sources?: string[];
  apply_to_tags?: string[];
  exclude_tags?: string[];
  active_hours_start?: string | null;
  active_hours_end?: string | null;
  active_days?: number[];
  is_active?: boolean;
  priority?: number;
  fixed_user_id?: string | null;
}

export interface CreateMemberData {
  rule_id: string;
  user_id: string;
  percentage?: number;
  weight?: number;
  is_active?: boolean;
  max_leads_per_day?: number | null;
  max_leads_per_hour?: number | null;
  max_open_leads?: number | null;
}

export function useDistributionRules() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['distribution-rules', currentWorkspace?.id],
    queryFn: async (): Promise<DistributionRule[]> => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from('lead_distribution_rules')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('priority', { ascending: false });

      if (error) throw error;
      return data as DistributionRule[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useDistributionMembers(ruleId: string | undefined) {
  return useQuery({
    queryKey: ['distribution-members', ruleId],
    queryFn: async (): Promise<DistributionMember[]> => {
      if (!ruleId) return [];

      const { data: members, error } = await supabase
        .from('lead_distribution_members')
        .select('*')
        .eq('rule_id', ruleId);

      if (error) throw error;

      // Fetch profiles for members
      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      return members.map(member => ({
        ...member,
        profiles: profiles?.find(p => p.id === member.user_id) || undefined,
      })) as DistributionMember[];
    },
    enabled: !!ruleId,
  });
}

export function useDistributionLogs(limit = 50) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['distribution-logs', currentWorkspace?.id, limit],
    queryFn: async (): Promise<DistributionLog[]> => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from('lead_distribution_logs')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as DistributionLog[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useDistributionStats() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['distribution-stats', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todayLogs, error } = await supabase
        .from('lead_distribution_logs')
        .select('id, assigned_to, distribution_mode')
        .eq('workspace_id', currentWorkspace.id)
        .gte('created_at', today.toISOString());

      if (error) throw error;

      // Count by distribution mode
      const byMode: Record<string, number> = {};
      const byUser: Record<string, number> = {};
      
      todayLogs?.forEach(log => {
        if (log.distribution_mode) {
          byMode[log.distribution_mode] = (byMode[log.distribution_mode] || 0) + 1;
        }
        if (log.assigned_to) {
          byUser[log.assigned_to] = (byUser[log.assigned_to] || 0) + 1;
        }
      });

      return {
        totalToday: todayLogs?.length || 0,
        byMode,
        byUser,
      };
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useMemberLeadCounts(memberUserIds: string[]) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['member-lead-counts', currentWorkspace?.id, memberUserIds],
    queryFn: async () => {
      if (!currentWorkspace?.id || memberUserIds.length === 0) return {};

      const counts: Record<string, number> = {};

      for (const userId of memberUserIds) {
        const { count, error } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', currentWorkspace.id)
          .eq('assigned_to', userId)
          .not('status', 'in', '("won","lost")');

        if (!error) {
          counts[userId] = count || 0;
        }
      }

      return counts;
    },
    enabled: !!currentWorkspace?.id && memberUserIds.length > 0,
  });
}

export function useCreateDistributionRule() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (data: CreateRuleData) => {
      if (!currentWorkspace?.id) throw new Error('Workspace não encontrado');

      const { data: rule, error } = await supabase
        .from('lead_distribution_rules')
        .insert({
          workspace_id: currentWorkspace.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return rule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-rules'] });
      toast.success('Regra de distribuição criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar regra: ' + error.message);
    },
  });
}

export function useUpdateDistributionRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<DistributionRule> & { id: string }) => {
      const { data: rule, error } = await supabase
        .from('lead_distribution_rules')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return rule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-rules'] });
      toast.success('Regra atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar regra: ' + error.message);
    },
  });
}

export function useDeleteDistributionRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lead_distribution_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-rules'] });
      toast.success('Regra excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir regra: ' + error.message);
    },
  });
}

export function useCreateDistributionMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMemberData) => {
      const { data: member, error } = await supabase
        .from('lead_distribution_members')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return member;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-members'] });
      toast.success('Membro adicionado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao adicionar membro: ' + error.message);
    },
  });
}

export function useUpdateDistributionMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<DistributionMember> & { id: string }) => {
      const { data: member, error } = await supabase
        .from('lead_distribution_members')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return member;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-members'] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar membro: ' + error.message);
    },
  });
}

export function useDeleteDistributionMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lead_distribution_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-members'] });
      toast.success('Membro removido com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao remover membro: ' + error.message);
    },
  });
}

export function useBulkUpdateDistributionMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (members: Array<Partial<DistributionMember> & { id: string }>) => {
      const updates = members.map(({ id, ...data }) =>
        supabase
          .from('lead_distribution_members')
          .update(data)
          .eq('id', id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error('Erro ao atualizar membros');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-members'] });
      toast.success('Membros atualizados com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar membros: ' + error.message);
    },
  });
}

export function useDistributePendingLeads() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error('Workspace não encontrado');

      // Get unassigned leads
      const { data: unassignedLeads, error: leadsError } = await supabase
        .from('leads')
        .select('id, pipeline_id, source')
        .eq('workspace_id', currentWorkspace.id)
        .is('assigned_to', null)
        .limit(100);

      if (leadsError) throw leadsError;

      if (!unassignedLeads || unassignedLeads.length === 0) {
        return { distributed: 0 };
      }

      // Call distribute-lead function for each lead
      let distributed = 0;
      for (const lead of unassignedLeads) {
        try {
          const { error } = await supabase.functions.invoke('distribute-lead', {
            body: {
              lead_id: lead.id,
              workspace_id: currentWorkspace.id,
              pipeline_id: lead.pipeline_id,
              source: lead.source || 'manual',
            },
          });

          if (!error) distributed++;
        } catch (e) {
          console.error('Error distributing lead:', lead.id, e);
        }
      }

      return { distributed };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['distribution-logs'] });
      queryClient.invalidateQueries({ queryKey: ['distribution-stats'] });
      toast.success(`${data.distributed} leads distribuídos com sucesso!`);
    },
    onError: (error) => {
      toast.error('Erro ao distribuir leads: ' + error.message);
    },
  });
}
