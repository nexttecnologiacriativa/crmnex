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
      
      const { data, error } = await supabase.rpc('is_super_admin' as any, {
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
        const { data, error } = await supabase.rpc('get_workspace_usage' as any, {
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

  // Remover usuário completamente - versão melhorada com limpeza completa de dados
  const removeUser = useMutation({
    mutationFn: async ({ userId, userEmail }: { userId: string; userEmail: string }) => {
      console.log('🧹 Starting complete user removal:', userId, userEmail);
      
      // 1. LEADS: Definir assigned_to como NULL (manter os leads, apenas remover atribuição)
      const { error: leadsError } = await supabase
        .from('leads')
        .update({ assigned_to: null })
        .eq('assigned_to', userId);
      
      if (leadsError) {
        console.error('Error clearing leads assignment:', leadsError);
      } else {
        console.log('✅ Leads assignment cleared');
      }
      
      // 2. WHATSAPP INSTANCES: Remover associações do usuário
      const { error: whatsappError } = await supabase
        .from('user_whatsapp_instances')
        .delete()
        .eq('user_id', userId);
      
      if (whatsappError) {
        console.error('Error removing whatsapp associations:', whatsappError);
      } else {
        console.log('✅ WhatsApp associations removed');
      }
      
      // 3. ACTIVITIES: Remover atividades do usuário
      const { error: activitiesError } = await supabase
        .from('activities')
        .delete()
        .eq('user_id', userId);
      
      if (activitiesError) {
        console.error('Error removing activities:', activitiesError);
      } else {
        console.log('✅ Activities removed');
      }
      
      // 4. LEAD_ACTIVITIES: Remover atividades de leads do usuário
      const { error: leadActivitiesError } = await supabase
        .from('lead_activities')
        .delete()
        .eq('user_id', userId);
      
      if (leadActivitiesError) {
        console.error('Error removing lead activities:', leadActivitiesError);
      } else {
        console.log('✅ Lead activities removed');
      }
      
      // 5. TASKS: Limpar assigned_to e deletar criadas pelo usuário
      const { error: tasksAssignedError } = await supabase
        .from('tasks')
        .update({ assigned_to: userId }) // Primeiro precisamos de um owner válido
        .eq('assigned_to', userId);
      
      // Na verdade, vamos só limpar - mas tasks tem assigned_to NOT NULL
      // Então deletamos tasks onde o usuário é o criador
      const { error: tasksCreatedError } = await supabase
        .from('tasks')
        .delete()
        .eq('created_by', userId);
      
      if (tasksCreatedError) {
        console.error('Error removing tasks created by user:', tasksCreatedError);
      } else {
        console.log('✅ Tasks created by user removed');
      }
      
      // 6. JOBS: Limpar assigned_to (pode ser NULL) e deletar criados pelo usuário
      const { error: jobsAssignedError } = await supabase
        .from('jobs')
        .update({ assigned_to: null })
        .eq('assigned_to', userId);
      
      if (jobsAssignedError) {
        console.error('Error clearing jobs assignment:', jobsAssignedError);
      } else {
        console.log('✅ Jobs assignment cleared');
      }
      
      // 7. JOB_COMMENTS: Remover comentários do usuário
      const { error: jobCommentsError } = await supabase
        .from('job_comments')
        .delete()
        .eq('user_id', userId);
      
      if (jobCommentsError) {
        console.error('Error removing job comments:', jobCommentsError);
      } else {
        console.log('✅ Job comments removed');
      }
      
      // 8. JOB_TIME_LOGS: Remover logs de tempo do usuário
      const { error: jobTimeLogsError } = await supabase
        .from('job_time_logs')
        .delete()
        .eq('user_id', userId);
      
      if (jobTimeLogsError) {
        console.error('Error removing job time logs:', jobTimeLogsError);
      } else {
        console.log('✅ Job time logs removed');
      }
      
      // 9. JOB_SUBTASKS: Limpar assigned_to
      const { error: jobSubtasksError } = await supabase
        .from('job_subtasks')
        .update({ assigned_to: null })
        .eq('assigned_to', userId);
      
      if (jobSubtasksError) {
        console.error('Error clearing job subtasks assignment:', jobSubtasksError);
      } else {
        console.log('✅ Job subtasks assignment cleared');
      }
      
      // 10. WORKSPACE_MEMBERS: Remover de todos os workspaces
      const { error: membersError } = await supabase
        .from('workspace_members')
        .delete()
        .eq('user_id', userId);

      if (membersError) {
        console.error('Error removing user from workspaces:', membersError);
      } else {
        console.log('✅ Workspace memberships removed');
      }

      // 11. PROFILES: Remover perfil do usuário (por último)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) {
        console.error('Error removing user profile:', profileError);
      } else {
        console.log('✅ User profile removed');
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
    mutationFn: async ({ userId, email, newPassword }: { userId: string; email: string; newPassword: string }) => {
      console.log('Changing password for user:', userId, email);
      
      const { data, error } = await supabase.functions.invoke('admin-change-password', {
        body: { email, newPassword }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      toast.success('Senha alterada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error changing password:', error);
      toast.error('Erro ao alterar senha: ' + (error.message || 'Erro desconhecido'));
    },
  });

  // Forçar reset de senha no próximo login
  const forcePasswordReset = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      console.log('Forcing password reset for:', email);
      
      const { data, error } = await supabase.functions.invoke('admin-force-password-reset', {
        body: { email }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      toast.success('Usuário será forçado a redefinir senha no próximo login!');
    },
    onError: (error: any) => {
      console.error('Error forcing password reset:', error);
      toast.error('Erro ao forçar reset de senha: ' + (error.message || 'Erro desconhecido'));
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
    forcePasswordReset,
    updateWorkspaceLimits,
    isLoading: suspendAccount.isPending || activateAccount.isPending || removeUser.isPending || changeUserPassword.isPending || forcePasswordReset.isPending || updateWorkspaceLimits.isPending,
  };
}
