import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useToast } from '@/hooks/use-toast';
import { normalizeForMatch } from '@/lib/phone';

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  value: number | null;
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  workspace_id: string;
}

interface DuplicateGroup {
  normalizedPhone: string;
  leads: Lead[];
}

export function useDuplicateLeads() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['duplicate-leads', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data: leads, error } = await supabase
        .from('leads')
        .select('id, name, email, phone, company, source, value, created_at, updated_at, assigned_to, workspace_id')
        .eq('workspace_id', currentWorkspace.id)
        .not('phone', 'is', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group leads by normalized phone
      const phoneGroups = new Map<string, Lead[]>();

      for (const lead of leads || []) {
        if (!lead.phone) continue;
        
        const normalized = normalizeForMatch(lead.phone);
        if (!normalized || normalized.length < 8) continue;

        const existing = phoneGroups.get(normalized) || [];
        existing.push(lead as Lead);
        phoneGroups.set(normalized, existing);
      }

      // Filter only groups with 2+ leads
      const duplicates: DuplicateGroup[] = [];
      phoneGroups.forEach((leads, normalizedPhone) => {
        if (leads.length >= 2) {
          duplicates.push({ normalizedPhone, leads });
        }
      });

      // Sort by number of duplicates (most first)
      return duplicates.sort((a, b) => b.leads.length - a.leads.length);
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useMergeLeads() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ sourceLeadId, targetLeadId }: { sourceLeadId: string; targetLeadId: string }) => {
      if (!currentWorkspace?.id) throw new Error('No workspace');

      const { data, error } = await supabase.functions.invoke('merge-leads', {
        body: {
          sourceLeadId,
          targetLeadId,
          workspaceId: currentWorkspace.id
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Merge failed');

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['duplicate-leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-activities'] });
      toast({
        title: 'Leads mesclados',
        description: 'Os leads foram mesclados com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao mesclar leads',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
