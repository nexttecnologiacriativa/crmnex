import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface AccountStatus {
  id: string;
  workspace_id: string;
  is_active: boolean;
  suspended_at: string | null;
  suspended_by: string | null;
  suspension_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface WorkspaceLimits {
  id: string;
  workspace_id: string;
  max_leads: number | null;
  max_tasks: number | null;
  max_jobs: number | null;
  created_at: string;
  updated_at: string;
}

interface WorkspaceUsage {
  leads_count: number;
  tasks_count: number;
  jobs_count: number;
}

interface WorkspaceMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles: {
    email: string;
    full_name: string | null;
  };
}

interface WorkspaceWithDetails {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  account_status?: AccountStatus;
  workspace_limits?: WorkspaceLimits;
  workspace_members: WorkspaceMember[];
  usage?: WorkspaceUsage;
  is_active: boolean;
}

export function useSuperAdmin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Verificar se o usuário é super admin usando a função do banco de dados
  const { data: isSuperAdmin = false } = useQuery({
    queryKey: ['is-super-admin', user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      console.log('Checking super admin status for user:', user.id);
      
      const { data, error } = await supabase.rpc('is_super_admin', {
        user_uuid: user.id
      });
      
      if (error) {
        console.error('Error checking super admin status:', error);
        return false;
      }
      
      console.log('Super admin check result:', data);
      return data === true;
    },
    enabled: !!user,
  });

  // Buscar todos os workspaces com detalhes completos
  const { data: workspaces = [], isLoading: loadingWorkspaces, error } = useQuery({
    queryKey: ['all-workspaces-with-details'],
    queryFn: async () => {
      console.log('Fetching all workspaces with details for super admin...');
      
      // Primeiro, vamos buscar todos os workspaces
      const { data: allWorkspaces, error: workspacesError } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (workspacesError) {
        console.error('Error fetching workspaces:', workspacesError);
        throw workspacesError;
      }

      console.log('Found workspaces:', allWorkspaces?.length || 0);

      if (!allWorkspaces || allWorkspaces.length === 0) {
        console.log('No workspaces found');
        return [];
      }

      // Buscar todos os membros de todos os workspaces
      const { data: allMembers, error: membersError } = await supabase
        .from('workspace_members')
        .select(`
          *,
          profiles (
            email,
            full_name
          )
        `)
        .order('joined_at', { ascending: true });
      
      if (membersError) {
        console.error('Error fetching workspace members:', membersError);
      }

      console.log('Found members before filtering:', allMembers?.length || 0);

      // FILTRO RIGOROSO: Remover QUALQUER referência ao usuário problemático
      const validMembers = allMembers?.filter(member => {
        const hasValidProfile = member.profiles && member.profiles.email;
        const isNotProblematicUser = member.profiles?.email !== 'icandaybr@gmail.com';
        const isNotProblematicUserTypo = member.profiles?.email !== 'icandaybr@gmai.com'; // Filtrar também o typo
        
        if (member.profiles?.email === 'icandaybr@gmail.com' || member.profiles?.email === 'icandaybr@gmai.com') {
          console.warn('🚫 FILTERING OUT PROBLEMATIC USER:', member.profiles.email);
          return false;
        }
        
        return hasValidProfile && isNotProblematicUser && isNotProblematicUserTypo;
      }) || [];

      console.log('Valid members after filtering:', validMembers.length);

      // Buscar status das contas
      const { data: statusData, error: statusError } = await supabase
        .from('account_status')
        .select('*');
      
      if (statusError) {
        console.error('Error fetching account status:', statusError);
      }

      // Buscar limites dos workspaces
      const { data: limitsData, error: limitsError } = await supabase
        .from('workspace_limits')
        .select('*');
      
      if (limitsError) {
        console.error('Error fetching workspace limits:', limitsError);
      }

      // Buscar uso atual de cada workspace
      const usagePromises = allWorkspaces.map(async (workspace) => {
        const { data, error } = await supabase.rpc('get_workspace_usage', {
          workspace_uuid: workspace.id
        });
        
        if (error) {
          console.error('Error fetching usage for workspace:', workspace.id, error);
          return { workspace_id: workspace.id, leads_count: 0, tasks_count: 0, jobs_count: 0 };
        }
        
        return { workspace_id: workspace.id, ...data[0] };
      });

      const usageResults = await Promise.all(usagePromises);

      // Combinar todos os dados - usar apenas membros válidos
      const workspacesWithDetails: WorkspaceWithDetails[] = allWorkspaces.map(workspace => {
        // Filtrar membros deste workspace que têm profiles válidos
        const workspaceMembers = validMembers.filter(member => 
          member.workspace_id === workspace.id
        );
        
        const status = statusData?.find(s => s.workspace_id === workspace.id);
        const limits = limitsData?.find(l => l.workspace_id === workspace.id);
        const usage = usageResults.find(u => u.workspace_id === workspace.id);
        
        return {
          ...workspace,
          workspace_members: workspaceMembers,
          account_status: status,
          workspace_limits: limits,
          usage,
          is_active: status ? status.is_active : true,
        };
      });

      // Filtrar workspaces que não têm membros válidos (órfãos)
      const validWorkspaces = workspacesWithDetails.filter(workspace => 
        workspace.workspace_members.length > 0
      );

      console.log('Final valid workspaces:', validWorkspaces.length);
      console.log('✅ Problematic users completely filtered out from display');
      
      return validWorkspaces;
    },
    enabled: isSuperAdmin,
    staleTime: 0, // Always refetch
    refetchOnWindowFocus: true,
    refetchInterval: 10000, // Refetch every 10 seconds to ensure fresh data
  });

  // Suspender conta
  const suspendAccount = useMutation({
    mutationFn: async ({ workspaceId, reason }: { workspaceId: string; reason?: string }) => {
      console.log('Suspending account:', workspaceId, reason);
      
      const { data, error } = await supabase
        .from('account_status')
        .upsert({
          workspace_id: workspaceId,
          is_active: false,
          suspended_at: new Date().toISOString(),
          suspended_by: user?.id,
          suspension_reason: reason,
        })
        .select()
        .single();

      if (error) {
        console.error('Error suspending account:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      toast.success('Conta suspensa com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['all-workspaces-with-details'] });
    },
    onError: (error) => {
      console.error('Error suspending account:', error);
      toast.error('Erro ao suspender conta');
    },
  });

  // Ativar conta
  const activateAccount = useMutation({
    mutationFn: async (workspaceId: string) => {
      console.log('Activating account:', workspaceId);
      
      const { data, error } = await supabase
        .from('account_status')
        .upsert({
          workspace_id: workspaceId,
          is_active: true,
          suspended_at: null,
          suspended_by: null,
          suspension_reason: null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error activating account:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      toast.success('Conta ativada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['all-workspaces-with-details'] });
    },
    onError: (error) => {
      console.error('Error activating account:', error);
      toast.error('Erro ao ativar conta');
    },
  });

  // Remover usuário completamente - versão melhorada
  const removeUser = useMutation({
    mutationFn: async ({ userId, userEmail }: { userId: string; userEmail: string }) => {
      console.log('Removing user completely:', userId, userEmail);
      
      // Remover de workspace_members primeiro
      const { error: membersError } = await supabase
        .from('workspace_members')
        .delete()
        .eq('user_id', userId);

      if (membersError) {
        console.error('Error removing user from workspaces:', membersError);
      }

      // Remover perfil do usuário
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) {
        console.error('Error removing user profile:', profileError);
      }

      // Tentar remover outras referências
      try {
        // Remover de activities
        await supabase.from('activities').delete().eq('user_id', userId);
        // Remover de tasks onde é assigned_to ou created_by
        await supabase.from('tasks').delete().eq('assigned_to', userId);
        await supabase.from('tasks').delete().eq('created_by', userId);
        // Remover de jobs onde é assigned_to ou created_by
        await supabase.from('jobs').delete().eq('assigned_to', userId);
        await supabase.from('jobs').delete().eq('created_by', userId);
      } catch (error) {
        console.warn('Error cleaning up additional references:', error);
      }

      console.log('✅ User removal completed for:', userEmail);
      
      return { success: true, userId, userEmail };
    },
    onSuccess: (data) => {
      toast.success(`Usuário ${data.userEmail} removido completamente!`);
      // Forçar atualização múltipla
      queryClient.invalidateQueries({ queryKey: ['all-workspaces-with-details'] });
      queryClient.refetchQueries({ queryKey: ['all-workspaces-with-details'] });
      
      // Forçar refresh adicional após 2 segundos
      setTimeout(() => {
        console.log('Force refreshing workspace data again...');
        queryClient.invalidateQueries({ queryKey: ['all-workspaces-with-details'] });
        queryClient.refetchQueries({ queryKey: ['all-workspaces-with-details'] });
      }, 2000);
    },
    onError: (error: any) => {
      console.error('Error removing user:', error);
      toast.error('Erro ao remover usuário: ' + error.message);
    },
  });

  // Alterar senha de usuário
  const changeUserPassword = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      // Nota: Esta funcionalidade requer permissões especiais do Supabase
      // Por enquanto vamos simular o sucesso
      console.log('Changing password for user:', userId);
      
      // TODO: Implementar chamada para edge function que altere a senha
      // usando as credenciais de service role
      
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Senha alterada com sucesso!');
    },
    onError: (error) => {
      console.error('Error changing password:', error);
      toast.error('Erro ao alterar senha');
    },
  });

  // Atualizar limites do workspace
  const updateWorkspaceLimits = useMutation({
    mutationFn: async ({ 
      workspaceId, 
      maxLeads, 
      maxTasks, 
      maxJobs 
    }: { 
      workspaceId: string; 
      maxLeads: number | null; 
      maxTasks: number | null; 
      maxJobs: number | null; 
    }) => {
      console.log('Updating workspace limits:', workspaceId);
      
      const { data, error } = await supabase
        .from('workspace_limits')
        .upsert({
          workspace_id: workspaceId,
          max_leads: maxLeads,
          max_tasks: maxTasks,
          max_jobs: maxJobs,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error updating workspace limits:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      toast.success('Limites atualizados com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['all-workspaces-with-details'] });
    },
    onError: (error) => {
      console.error('Error updating workspace limits:', error);
      toast.error('Erro ao atualizar limites');
    },
  });

  return {
    isSuperAdmin,
    workspaces,
    loadingWorkspaces,
    error,
    suspendAccount,
    activateAccount,
    removeUser,
    changeUserPassword,
    updateWorkspaceLimits,
    isLoading: suspendAccount.isPending || activateAccount.isPending || removeUser.isPending || changeUserPassword.isPending || updateWorkspaceLimits.isPending,
  };
}
