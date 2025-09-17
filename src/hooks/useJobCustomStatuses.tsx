import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';
import { toast } from 'sonner';

export interface JobCustomStatus {
  id: string;
  workspace_id: string;
  status_id: string;
  status_label: string;
  status_color: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export function useJobCustomStatuses() {
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ['job_custom_statuses', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      
      const { data, error } = await supabase
        .from('job_custom_statuses')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('position');
      
      if (error) throw error;
      return data as JobCustomStatus[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useCreateJobCustomStatus() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  
  return useMutation({
    mutationFn: async ({
      status_id,
      status_label,
      status_color,
      position = 0
    }: {
      status_id: string;
      status_label: string;
      status_color: string;
      position?: number;
    }) => {
      if (!currentWorkspace) throw new Error('No workspace');
      
      const { data, error } = await supabase
        .from('job_custom_statuses')
        .insert({
          workspace_id: currentWorkspace.id,
          status_id,
          status_label,
          status_color,
          position
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job_custom_statuses'] });
      toast.success('Coluna personalizada criada!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar coluna: ' + error.message);
    },
  });
}

export function useUpdateJobCustomStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      statusId,
      status_label,
      status_color
    }: {
      statusId: string;
      status_label?: string;
      status_color?: string;
    }) => {
      const { data, error } = await supabase
        .from('job_custom_statuses')
        .update({
          status_label,
          status_color
        })
        .eq('status_id', statusId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job_custom_statuses'] });
      toast.success('Coluna atualizada!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar coluna: ' + error.message);
    },
  });
}

export function useDeleteJobCustomStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (statusId: string) => {
      const { error } = await supabase
        .from('job_custom_statuses')
        .delete()
        .eq('status_id', statusId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job_custom_statuses'] });
      toast.success('Coluna removida!');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover coluna: ' + error.message);
    },
  });
}