
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Webhook {
  id: string;
  workspace_id: string;
  name: string;
  url: string;
  secret: string | null;
  is_active: boolean;
  pipeline_id: string | null;
  stage_id: string | null;
  created_at: string;
  updated_at: string;
  pipeline?: {
    name: string;
  };
  stage?: {
    name: string;
  };
}

interface CreateWebhookData {
  workspace_id: string;
  name: string;
  url: string;
  secret?: string | null;
  is_active?: boolean;
  pipeline_id?: string | null;
  stage_id?: string | null;
}

interface UpdateWebhookData {
  id: string;
  name?: string;
  url?: string;
  secret?: string | null;
  is_active?: boolean;
  pipeline_id?: string | null;
  stage_id?: string | null;
}

export function useWebhooks(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['webhooks', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from('webhooks')
        .select(`
          *,
          pipeline:pipelines (
            name
          ),
          stage:pipeline_stages (
            name
          )
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Webhook[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (webhookData: CreateWebhookData) => {
      const { data, error } = await supabase
        .from('webhooks')
        .insert(webhookData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar webhook: ' + error.message);
    },
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updateData: UpdateWebhookData) => {
      const { id, ...data } = updateData;
      const { data: result, error } = await supabase
        .from('webhooks')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar webhook: ' + error.message);
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('webhooks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir webhook: ' + error.message);
    },
  });
}
