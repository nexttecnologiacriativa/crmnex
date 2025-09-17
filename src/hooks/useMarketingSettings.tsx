import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { toast } from '@/hooks/use-toast';

export interface MarketingSettings {
  id: string;
  workspace_id: string;
  default_api_type: 'whatsapp_official' | 'evolution';
  evolution_message_interval: number;
  max_messages_per_minute: number;
  created_at: string;
  updated_at: string;
}

export function useMarketingSettings() {
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ['marketing-settings', currentWorkspace?.id],
    queryFn: async (): Promise<MarketingSettings | null> => {
      if (!currentWorkspace?.id) return null;

      const { data, error } = await supabase
        .from('marketing_settings')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching marketing settings:', error);
        throw new Error('Failed to fetch marketing settings');
      }

      return data as MarketingSettings;
    },
    enabled: !!currentWorkspace?.id
  });
}

export function useUpdateMarketingSettings() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (settings: Partial<MarketingSettings>) => {
      if (!currentWorkspace?.id) {
        throw new Error('No workspace selected');
      }

      const { data, error } = await supabase
        .from('marketing_settings')
        .upsert({
          workspace_id: currentWorkspace.id,
          ...settings
        })
        .select()
        .single();

      if (error) {
        console.error('Error updating marketing settings:', error);
        throw new Error('Failed to update marketing settings');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-settings'] });
      toast({
        title: "Configurações atualizadas",
        description: "As configurações de marketing foram salvas com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Error updating marketing settings:', error);
      toast({
        title: "Erro ao salvar configurações",
        description: "Ocorreu um erro ao salvar as configurações. Tente novamente.",
        variant: "destructive",
      });
    }
  });
}