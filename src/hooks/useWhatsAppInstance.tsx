
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
  display_name?: string | null;
}

// Hook to get current user's role in the workspace
export function useWorkspaceMembership() {
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ['workspace-membership', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', currentWorkspace.id)
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching membership:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!currentWorkspace,
  });
}

// Hook for Atendimento - ALL users see only their associated instances
export function useWhatsAppInstances() {
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ['whatsapp-instances-user', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      // Generate workspace prefix for security filtering
      const workspacePrefix = `ws_${currentWorkspace.id.substring(0, 8)}_`;
      
      // ALL users (including admins) only see instances they're associated with
      const { data: associations, error: assocError } = await supabase
        .from('user_whatsapp_instances')
        .select('instance_id')
        .eq('user_id', user.id);
      
      if (assocError) {
        console.error('Error fetching user instance associations:', assocError);
        return [];
      }
      
      const instanceIds = associations?.map(a => a.instance_id) || [];
      
      if (instanceIds.length === 0) {
        console.log('🔒 User has no instance associations, returning empty list');
        return [];
      }
      
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .in('id', instanceIds)
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      const instances = (data as WhatsAppInstance[]) || [];
      
      // SECURITY: Filter out instances that don't belong to this workspace
      const secureInstances = instances.filter(instance => {
        const belongsToWorkspace = instance.instance_name.startsWith(workspacePrefix);
        
        if (!belongsToWorkspace) {
          console.warn(`🔒 Filtering out instance ${instance.instance_name} - doesn't belong to workspace ${currentWorkspace.id}`);
        }
        
        return belongsToWorkspace;
      });
      
      console.log(`🔒 User instances: ${secureInstances.length} associated instances`);
      
      return secureInstances;
    },
    enabled: !!currentWorkspace,
  });
}

// Hook for Settings/InstanceManager - Admins see ALL workspace instances
export function useAllWorkspaceInstances() {
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ['whatsapp-instances-all', currentWorkspace?.id],
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
      const instances = (data as WhatsAppInstance[]) || [];
      
      // SECURITY: Filter out instances that don't belong to this workspace
      const secureInstances = instances.filter(instance => {
        const belongsToWorkspace = instance.instance_name.startsWith(workspacePrefix);
        
        if (!belongsToWorkspace) {
          console.warn(`🔒 Filtering out instance ${instance.instance_name} - doesn't belong to workspace ${currentWorkspace.id}`);
        }
        
        return belongsToWorkspace;
      });
      
      console.log(`🔒 All workspace instances: ${secureInstances.length} instances`);
      
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
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances-user'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances-all'] });
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
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances-user'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances-all'] });
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
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances-user'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances-all'] });
      
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

// Hook to update instance display name
export function useUpdateInstanceDisplayName() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ instanceId, displayName }: { instanceId: string; displayName: string | null }) => {
      const { error } = await supabase
        .from('whatsapp_instances')
        .update({ display_name: displayName })
        .eq('id', instanceId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances-user'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances-all'] });
      toast.success('Nome da instância atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar nome: ' + error.message);
    },
  });
}

// Hook to get user instance associations for an instance
export function useInstanceUsers(instanceId: string | null) {
  return useQuery({
    queryKey: ['instance-users', instanceId],
    queryFn: async () => {
      if (!instanceId) return [];
      
      const { data, error } = await supabase
        .from('user_whatsapp_instances')
        .select('user_id')
        .eq('instance_id', instanceId);
      
      if (error) {
        console.error('Error fetching instance users:', error);
        return [];
      }
      
      return data?.map(d => d.user_id) || [];
    },
    enabled: !!instanceId,
  });
}

// Hook to manage user instance associations
export function useManageInstanceUsers() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ instanceId, userId, action }: { instanceId: string; userId: string; action: 'add' | 'remove' }) => {
      if (action === 'add') {
        const { error } = await supabase
          .from('user_whatsapp_instances')
          .insert({ user_id: userId, instance_id: instanceId });
        
        if (error && !error.message.includes('duplicate')) throw error;
      } else {
        const { error } = await supabase
          .from('user_whatsapp_instances')
          .delete()
          .eq('user_id', userId)
          .eq('instance_id', instanceId);
        
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['instance-users', variables.instanceId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances-user'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances-all'] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar acesso: ' + error.message);
    },
  });
}

// Hook to get workspace members
export function useWorkspaceMembers() {
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ['workspace-members-list', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      
      const { data, error } = await supabase
        .from('workspace_members')
        .select('user_id, role, profiles(id, full_name, email)')
        .eq('workspace_id', currentWorkspace.id);
      
      if (error) {
        console.error('Error fetching workspace members:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!currentWorkspace,
  });
}
