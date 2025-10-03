import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useWorkspace } from './useWorkspace';
import { toast } from 'sonner';

interface Lead {
  id: string;
  workspace_id: string;
  pipeline_id: string;
  stage_id: string;
  assigned_to: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  value: number | null;
  currency: string;
  notes: string | null;
  status: string;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  custom_fields: any;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
  pipeline_stages?: {
    name: string;
    color: string;
  };
  lead_tag_relations?: {
    id: string;
    tag_id: string;
    lead_tags: {
      id: string;
      name: string;
      color: string;
    };
  }[];
}

interface CreateLeadData {
  workspace_id: string;
  pipeline_id: string;
  stage_id: string;
  assigned_to: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  position?: string | null;
  value?: number | null;
  currency: string;
  notes?: string | null;
  status: "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost";
  source?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  custom_fields?: any;
}

interface UpdateLeadData {
  id: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  position?: string | null;
  value?: number | null;
  notes?: string | null;
  source?: string | null;
  pipeline_id?: string;
  stage_id?: string;
  assigned_to?: string | null;
  status?: "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost";
  pipeline_tag?: string;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  custom_fields?: any;
}

export function useLeads() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['leads', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) {
        return [];
      }

      const { data: workspaceLeads, error: workspaceError } = await supabase
        .from('leads')
        .select(`
          *,
          profiles!leads_assigned_to_fkey (
            full_name,
            email
          ),
          pipeline_stages (
            name,
            color
          ),
          lead_tag_relations (
            id,
            tag_id,
            lead_tags (
              id,
              name,
              color
            )
          )
        `)
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false })
        .limit(10000);
      
      if (workspaceError) {
        throw workspaceError;
      }
      
      return workspaceLeads as Lead[];
    },
    enabled: !!currentWorkspace?.id && !!user,
    staleTime: 30 * 1000, // 30 segundos
    refetchOnWindowFocus: true,
  });
}

export function useLeadsCount() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['leads-count', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return 0;

      const { count, error } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', currentWorkspace.id);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!currentWorkspace?.id && !!user,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (leadData: CreateLeadData & { skip_automation?: boolean }) => {
      const { skip_automation, ...data } = leadData;
      const { data: result, error } = await supabase
        .from('leads')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      
      // Não disparar automação se skip_automation for true
      if (!skip_automation) {
        // Disparar automação apenas se não foi explicitamente desabilitada
        try {
          await supabase.functions.invoke('lead-created-trigger', {
            body: { 
              lead_id: result.id,
              workspace_id: data.workspace_id
            }
          });
        } catch (automationError) {
          console.error('Erro ao disparar automação:', automationError);
          // Não falhar a criação do lead por causa da automação
        }
      }
      
      return result;
    },
    onSuccess: (data) => {
      // Invalida todas as queries de leads
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.refetchQueries({ queryKey: ['leads'] });
      toast.success('Lead criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar lead: ' + error.message);
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updateData: UpdateLeadData) => {
      const { id, ...data } = updateData;
      const { data: result, error } = await supabase
        .from('leads')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      // Invalida todas as queries de leads
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.refetchQueries({ queryKey: ['leads'] });
      toast.success('Lead atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar lead: ' + error.message);
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalida todas as queries de leads
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.refetchQueries({ queryKey: ['leads'] });
      toast.success('Lead excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir lead: ' + error.message);
    },
  });
}
