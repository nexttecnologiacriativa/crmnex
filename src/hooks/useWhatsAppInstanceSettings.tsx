import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { toast } from 'sonner';

export interface WhatsAppInstanceSettings {
  id: string;
  instance_id: string;
  workspace_id: string;
  auto_create_lead: boolean;
  default_pipeline_id: string | null;
  default_stage_id: string | null;
  assigned_to: string | null;
  auto_tag_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useWhatsAppInstanceSettings(instanceId: string | null) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['whatsapp-instance-settings', instanceId],
    queryFn: async () => {
      if (!instanceId || !currentWorkspace?.id) return null;

      const { data, error } = await supabase
        .from('whatsapp_instance_settings')
        .select('*')
        .eq('instance_id', instanceId)
        .maybeSingle();

      if (error) throw error;
      return data as WhatsAppInstanceSettings | null;
    },
    enabled: !!instanceId && !!currentWorkspace?.id,
  });
}

export function useAllInstanceSettings() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['whatsapp-instance-settings', 'all', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from('whatsapp_instance_settings')
        .select('*')
        .eq('workspace_id', currentWorkspace.id);

      if (error) throw error;
      return data as WhatsAppInstanceSettings[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useUpdateInstanceSettings() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: {
      instance_id: string;
      auto_create_lead?: boolean;
      default_pipeline_id?: string | null;
      default_stage_id?: string | null;
      assigned_to?: string | null;
      auto_tag_id?: string | null;
    }) => {
      if (!currentWorkspace?.id) throw new Error('Workspace não selecionado');

      const { data, error } = await supabase
        .from('whatsapp_instance_settings')
        .upsert({
          instance_id: settings.instance_id,
          workspace_id: currentWorkspace.id,
          auto_create_lead: settings.auto_create_lead ?? false,
          default_pipeline_id: settings.default_pipeline_id,
          default_stage_id: settings.default_stage_id,
          assigned_to: settings.assigned_to,
          auto_tag_id: settings.auto_tag_id,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'instance_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instance-settings'] });
      toast.success('Configurações salvas com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating instance settings:', error);
      toast.error('Erro ao salvar configurações');
    },
  });
}
