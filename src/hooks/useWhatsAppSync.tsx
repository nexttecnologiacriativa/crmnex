import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';
import { toast } from 'sonner';

interface SyncOptions {
  messageLimit?: number;
  daysBack?: number;
  includeMedia?: boolean;
  onlyNewMessages?: boolean;
}

interface SyncStatus {
  workspace_id: string;
  instance_name: string;
  last_sync_at: string;
  total_conversations: number;
  processed_conversations: number;
  total_messages: number;
  sync_options: SyncOptions;
  errors: string[];
}

export function useWhatsAppHistorySync() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const [syncProgress, setSyncProgress] = useState<string>('');

  const getEvolutionConfig = () => {
    if (!currentWorkspace) return null;
    const configKey = `evolution_config_${currentWorkspace.id}`;
    const stored = localStorage.getItem(configKey);
    return stored ? JSON.parse(stored) : null;
  };

  const syncHistoryMutation = useMutation({
    mutationFn: async ({ instanceName, syncOptions }: { 
      instanceName: string; 
      syncOptions?: SyncOptions 
    }) => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      
      const config = getEvolutionConfig();
      if (!config?.global_api_key) {
        throw new Error('Configure a API Key da Evolution primeiro');
      }

      setSyncProgress('Iniciando sincronização...');
      
      const { data, error } = await supabase.functions.invoke('whatsapp-sync-history', {
        body: {
          action: 'sync_full_history',
          instanceName,
          workspaceId: currentWorkspace.id,
          apiKey: config.global_api_key,
          apiUrl: config.api_url,
          syncOptions: {
            messageLimit: 100,
            daysBack: 30,
            includeMedia: true,
            onlyNewMessages: false,
            ...syncOptions
          }
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-webhook-messages'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-sync-status'] });
      
      const { summary } = data;
      setSyncProgress('');
      
      toast.success(
        `Sincronização concluída! ${summary.processed_conversations} conversas e ${summary.total_messages} mensagens sincronizadas.`
      );
    },
    onError: (error: any) => {
      setSyncProgress('');
      toast.error('Erro na sincronização: ' + error.message);
    },
  });

  const syncConversationsOnlyMutation = useMutation({
    mutationFn: async (instanceName: string) => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      
      const config = getEvolutionConfig();
      if (!config?.global_api_key) {
        throw new Error('Configure a API Key da Evolution primeiro');
      }
      
      const { data, error } = await supabase.functions.invoke('whatsapp-sync-history', {
        body: {
          action: 'sync_conversations',
          instanceName,
          workspaceId: currentWorkspace.id,
          apiKey: config.global_api_key,
          apiUrl: config.api_url,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      toast.success(`${data.created} conversas criadas, ${data.updated} atualizadas`);
    },
    onError: (error: any) => {
      toast.error('Erro ao sincronizar conversas: ' + error.message);
    },
  });

  return {
    syncFullHistory: syncHistoryMutation.mutate,
    syncConversationsOnly: syncConversationsOnlyMutation.mutate,
    isLoading: syncHistoryMutation.isPending || syncConversationsOnlyMutation.isPending,
    syncProgress,
    setSyncProgress
  };
}

export function useWhatsAppSyncStatus() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['whatsapp-sync-status', currentWorkspace?.id],
    queryFn: async (): Promise<SyncStatus[] | null> => {
      if (!currentWorkspace) return null;
      
      const { data, error } = await supabase.functions.invoke('whatsapp-sync-history', {
        body: {
          action: 'get_sync_status',
          workspaceId: currentWorkspace.id,
          instanceName: 'all'
        }
      });
      
      if (error) throw error;
      return data?.sync_status ? [data.sync_status] : [];
    },
    enabled: !!currentWorkspace,
  });
}

export function useEnableFullHistorySync() {
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (instanceName: string) => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      
      const config = JSON.parse(localStorage.getItem(`evolution_config_${currentWorkspace.id}`) || '{}');
      if (!config?.global_api_key) {
        throw new Error('Configure a API Key da Evolution primeiro');
      }

      // Update instance configuration to enable full history sync
      const { data, error } = await supabase.functions.invoke('whatsapp-evolution', {
        body: {
          action: 'update_instance_config',
          instanceName,
          workspaceId: currentWorkspace.id,
          apiKey: config.global_api_key,
          apiUrl: config.api_url,
          config: {
            syncFullHistory: true,
            readMessages: true,
            readStatus: true
          }
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Configuração de sincronização atualizada!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar configuração: ' + error.message);
    },
  });
}