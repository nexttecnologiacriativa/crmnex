import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';
import { toast } from 'sonner';

export interface WorkspaceSettings {
  id: string;
  workspace_id: string;
  default_pipeline_id: string | null;
  n8n_webhook_url: string | null;
  openai_api_key: string | null;
  ai_insights_pipeline_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

export function useWorkspaceSettings() {
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ['workspace_settings', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;
      
      const { data, error } = await supabase
        .from('workspace_settings')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as WorkspaceSettings | null;
    },
    enabled: !!currentWorkspace,
  });
}

export function useUpdateWorkspaceSettings() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  
  return useMutation({
    mutationFn: async (settings: Partial<WorkspaceSettings>) => {
      if (!currentWorkspace) throw new Error('No workspace');
      
      const { data, error } = await supabase
        .from('workspace_settings')
        .upsert({
          workspace_id: currentWorkspace.id,
          ...settings
        }, {
          onConflict: 'workspace_id'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace_settings'] });
      toast.success('Configurações atualizadas!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar configurações: ' + error.message);
    },
  });
}