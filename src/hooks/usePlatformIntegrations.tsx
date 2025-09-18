import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PlatformIntegration {
  id: string;
  workspace_id: string;
  name: string;
  platform: string;
  webhook_url: string;
  selected_tag_ids: string[];
  selected_pipeline_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CreatePlatformIntegrationData {
  workspace_id: string;
  name: string;
  platform: string;
  selected_tag_ids: string[];
  selected_pipeline_id: string;
}

interface UpdatePlatformIntegrationData {
  id: string;
  name?: string;
  platform?: string;
  selected_tag_ids?: string[];
  selected_pipeline_id?: string;
  is_active?: boolean;
}

export function usePlatformIntegrations(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['platform-integrations', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from('platform_integrations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PlatformIntegration[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreatePlatformIntegration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (integrationData: CreatePlatformIntegrationData) => {
      // Gerar URL do webhook
      const integrationId = crypto.randomUUID();
      const webhookUrl = `https://mqotdnvwyjhyiqzbefpm.supabase.co/functions/v1/platform-webhook-receiver?integration_id=${integrationId}`;
      
      const { data, error } = await supabase
        .from('platform_integrations')
        .insert({
          ...integrationData,
          webhook_url: webhookUrl,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-integrations'] });
      toast.success('Integração criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar integração: ' + error.message);
    },
  });
}

export function useUpdatePlatformIntegration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updateData: UpdatePlatformIntegrationData) => {
      const { id, ...data } = updateData;
      const { data: result, error } = await supabase
        .from('platform_integrations')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-integrations'] });
      toast.success('Integração atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar integração: ' + error.message);
    },
  });
}

export function useDeletePlatformIntegration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (integrationId: string) => {
      const { error } = await supabase
        .from('platform_integrations')
        .delete()
        .eq('id', integrationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-integrations'] });
      toast.success('Integração removida com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover integração: ' + error.message);
    },
  });
}