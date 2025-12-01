
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';
import { toast } from 'sonner';

interface WhatsAppInstance {
  id: string;
  workspace_id: string;
  instance_name: string;
  instance_key: string;
  qr_code: string | null;
  status: string;
  phone_number: string | null;
  webhook_url: string | null;
  created_at: string;
  updated_at: string;
  last_seen: string | null;
}

export function useWhatsAppInstances() {
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ['whatsapp-instances', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      
      // Generate workspace prefix for security filtering
      const workspacePrefix = `ws_${currentWorkspace.id.substring(0, 8)}_`;
      
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // SECURITY: Filter out instances that don't belong to this workspace
      const secureInstances = (data as WhatsAppInstance[] || []).filter(instance => {
        // Allow instances that start with the correct workspace prefix
        const belongsToWorkspace = instance.instance_name.startsWith(workspacePrefix);
        
        if (!belongsToWorkspace) {
          console.warn(`🔒 Filtering out instance ${instance.instance_name} - doesn't belong to workspace ${currentWorkspace.id}`);
        }
        
        return belongsToWorkspace;
      });
      
      console.log(`🔒 Workspace security: ${data?.length || 0} total instances, ${secureInstances.length} belong to workspace ${currentWorkspace.id}`);
      
      return secureInstances;
    },
    enabled: !!currentWorkspace,
  });
}

export function useCreateWhatsAppInstance() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  
  return useMutation({
    mutationFn: async (instanceName: string) => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      
      const { data, error } = await supabase.functions.invoke('whatsapp-evolution', {
        body: {
          action: 'create_instance',
          instanceName: instanceName, // Send original name, edge function will add prefix
          workspaceId: currentWorkspace.id,
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      toast.success('Instância do WhatsApp criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar instância: ' + error.message);
    },
  });
}

export function useGetQRCode() {
  const { currentWorkspace } = useWorkspace();
  
  return useMutation({
    mutationFn: async (instanceName: string) => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      
      const { data, error } = await supabase.functions.invoke('whatsapp-evolution', {
        body: {
          action: 'get_qr',
          instanceName: instanceName, // Use the name as stored (with prefix)
          workspaceId: currentWorkspace.id,
        },
      });
      
      if (error) throw error;
      return data;
    },
    onError: (error) => {
      toast.error('Erro ao obter QR Code: ' + error.message);
    },
  });
}

export function useGetInstanceStatus() {
  const { currentWorkspace } = useWorkspace();
  
  return useMutation({
    mutationFn: async (instanceName: string) => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      
      const { data, error } = await supabase.functions.invoke('whatsapp-evolution', {
        body: {
          action: 'get_status',
          instanceName: instanceName, // Use the name as stored (with prefix)
        },
      });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useSendWhatsAppMessage() {
  const { currentWorkspace } = useWorkspace();
  
  return useMutation({
    mutationFn: async ({ instanceName, phone, message, workspaceId }: {
      instanceName: string;
      phone: string;
      message: string;
      workspaceId?: string;
    }) => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      
      const { data, error } = await supabase.functions.invoke('whatsapp-evolution', {
        body: {
          action: 'send_message',
          instanceName,
          phone,
          message,
          workspaceId: workspaceId || currentWorkspace.id,
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Mensagem enviada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao enviar mensagem: ' + error.message);
    },
  });
}

export function useRecreateWhatsAppInstance() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  
  return useMutation({
    mutationFn: async ({ oldInstanceName, newInstanceName }: { oldInstanceName: string; newInstanceName: string }) => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      
      const { data, error } = await supabase.functions.invoke('whatsapp-evolution', {
        body: {
          action: 'recreate_instance',
          oldInstanceName,
          newInstanceName,
          workspaceId: currentWorkspace.id,
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      toast.success('Instância recriada com sucesso! Escaneie o QR Code para reconectar.');
    },
    onError: (error) => {
      toast.error('Erro ao recriar instância: ' + error.message);
    },
  });
}

export function useSyncWhatsAppInstances() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  
  return useMutation({
    mutationFn: async () => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      
      const { data, error } = await supabase.functions.invoke('whatsapp-evolution', {
        body: {
          action: 'list_instances',
          workspaceId: currentWorkspace.id,
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      
      const { syncResults, instances } = data;
      if (syncResults) {
        const { created, updated, removed, errors, orphansDetected } = syncResults;
        
        if (created.length > 0) {
          toast.success(`${created.length} instância(s) criada(s): ${created.join(', ')}`);
        }
        if (updated.length > 0) {
          toast.info(`${updated.length} instância(s) atualizada(s): ${updated.join(', ')}`);
        }
        if (removed.length > 0) {
          toast.warning(`${removed.length} instância(s) removida(s): ${removed.join(', ')}`);
        }
        if (orphansDetected && orphansDetected.length > 0) {
          toast.warning(`${orphansDetected.length} instância(s) não encontrada(s) na API Evolution. Use o botão "Recriar" para restaurá-las.`);
        }
        if (errors.length > 0) {
          console.warn('Sync warnings/errors:', errors);
          const hasChanges = (created.length + updated.length + removed.length) > 0;
          const isNotFound = errors.some((e: any) => String(e).includes('404'));
          if (hasChanges || isNotFound) {
            toast.warning(`Sincronização concluída com avisos: ${errors.length}`);
          } else {
            toast.error(`Erros na sincronização: ${errors.length} erro(s)`);
          }
        }
        
        if (created.length === 0 && updated.length === 0 && removed.length === 0 && errors.length === 0 && (!orphansDetected || orphansDetected.length === 0)) {
          toast.success('Instâncias sincronizadas - nenhuma alteração necessária');
        }
      }
    },
    onError: (error) => {
      toast.error('Erro ao sincronizar instâncias: ' + error.message);
    },
  });
}
