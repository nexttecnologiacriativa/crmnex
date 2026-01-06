import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useWorkspace } from './useWorkspace';
import { toast } from 'sonner';

export interface UserWorkspaceSettings {
  id: string;
  user_id: string;
  workspace_id: string;
  can_see_all_leads: boolean;
  can_see_unassigned_leads: boolean;
  default_whatsapp_instance_id: string | null;
  created_at: string;
  updated_at: string;
}

// Hook para obter configurações do usuário atual
export function useCurrentUserSettings() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ['user_workspace_settings', user?.id, currentWorkspace?.id],
    queryFn: async () => {
      if (!user?.id || !currentWorkspace?.id) return null;
      
      const { data, error } = await supabase
        .from('user_workspace_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('workspace_id', currentWorkspace.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as UserWorkspaceSettings | null;
    },
    enabled: !!user?.id && !!currentWorkspace?.id,
  });
}

// Hook para obter configurações de um usuário específico (para admins)
export function useUserSettings(userId: string | null) {
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ['user_workspace_settings', userId, currentWorkspace?.id],
    queryFn: async () => {
      if (!userId || !currentWorkspace?.id) return null;
      
      const { data, error } = await supabase
        .from('user_workspace_settings')
        .select('*')
        .eq('user_id', userId)
        .eq('workspace_id', currentWorkspace.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as UserWorkspaceSettings | null;
    },
    enabled: !!userId && !!currentWorkspace?.id,
  });
}

// Hook para atualizar configurações de um usuário
export function useUpdateUserSettings() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  
  return useMutation({
    mutationFn: async (settings: Partial<UserWorkspaceSettings> & { user_id: string }) => {
      if (!currentWorkspace?.id) throw new Error('No workspace');
      
      const { data, error } = await supabase
        .from('user_workspace_settings')
        .upsert({
          workspace_id: currentWorkspace.id,
          ...settings
        }, {
          onConflict: 'user_id,workspace_id'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user_workspace_settings', variables.user_id] });
      toast.success('Configurações do usuário atualizadas!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar configurações: ' + error.message);
    },
  });
}

// Hook para obter todas as configurações de usuários do workspace (para admins)
export function useAllUserSettings() {
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ['all_user_workspace_settings', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      
      const { data, error } = await supabase
        .from('user_workspace_settings')
        .select('*')
        .eq('workspace_id', currentWorkspace.id);
      
      if (error) throw error;
      return data as UserWorkspaceSettings[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

// Hook para verificar se o usuário atual pode ver todos os leads
export function useLeadVisibilityPermissions() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { data: settings, isLoading } = useCurrentUserSettings();
  
  // Buscar role do usuário
  const { data: membership } = useQuery({
    queryKey: ['user_membership', user?.id, currentWorkspace?.id],
    queryFn: async () => {
      if (!user?.id || !currentWorkspace?.id) return null;
      
      const { data, error } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('workspace_id', currentWorkspace.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!currentWorkspace?.id,
  });
  
  // Admins sempre podem ver todos os leads
  const isAdmin = membership?.role === 'admin';
  
  return {
    canSeeAllLeads: isAdmin || settings?.can_see_all_leads || false,
    canSeeUnassignedLeads: isAdmin || settings?.can_see_unassigned_leads !== false, // Default true
    isAdmin,
    isLoading,
    userId: user?.id,
  };
}
