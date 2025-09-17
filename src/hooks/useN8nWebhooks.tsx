import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';
import { toast } from 'sonner';

export interface N8nWebhook {
  id: string;
  workspace_id: string;
  pipeline_id: string;
  webhook_url: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useN8nWebhooks() {
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ['n8n_webhooks', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      
      const { data, error } = await supabase
        .from('n8n_webhooks')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as N8nWebhook[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useCreateN8nWebhook() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  
  return useMutation({
    mutationFn: async (webhook: Omit<N8nWebhook, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>) => {
      if (!currentWorkspace) throw new Error('No workspace');
      
      const { data, error } = await supabase
        .from('n8n_webhooks')
        .insert({
          workspace_id: currentWorkspace.id,
          ...webhook
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['n8n_webhooks'] });
      toast.success('Webhook n8n criado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar webhook: ' + error.message);
    },
  });
}

export function useUpdateN8nWebhook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...webhook }: Partial<N8nWebhook> & { id: string }) => {
      const { data, error } = await supabase
        .from('n8n_webhooks')
        .update(webhook)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['n8n_webhooks'] });
      toast.success('Webhook n8n atualizado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar webhook: ' + error.message);
    },
  });
}

export function useDeleteN8nWebhook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('n8n_webhooks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['n8n_webhooks'] });
      toast.success('Webhook n8n removido!');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover webhook: ' + error.message);
    },
  });
}