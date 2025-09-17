import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';

type UserRole = 'user' | 'manager' | 'admin';

interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: UserRole;
  joined_at: string;
  profiles: {
    email: string;
    full_name: string | null;
  } | null;
}

export function useTeamManagement() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();

  console.log('useTeamManagement - currentWorkspace:', currentWorkspace);
  console.log('useTeamManagement - user:', user?.id);

  // Buscar membros do workspace com verificação de políticas RLS
  const { data: members = [], refetch, isLoading, error } = useQuery({
    queryKey: ['workspace-members', currentWorkspace?.id],
    queryFn: async (): Promise<WorkspaceMember[]> => {
      if (!currentWorkspace?.id) {
        console.log('useTeamManagement: No current workspace found');
        return [];
      }
      
      console.log('useTeamManagement: Fetching members for workspace:', currentWorkspace.id);
      console.log('useTeamManagement: Current user ID:', user?.id);
      
      // Primeiro, verificar se o usuário atual é membro do workspace
      const { data: currentUserMembership, error: membershipError } = await supabase
        .from('workspace_members')
        .select('id, role')
        .eq('workspace_id', currentWorkspace.id)
        .eq('user_id', user?.id)
        .maybeSingle();

      console.log('useTeamManagement: Current user membership check:', {
        membership: currentUserMembership,
        error: membershipError
      });

      if (membershipError) {
        console.error('useTeamManagement: Error checking user membership:', membershipError);
        throw new Error('Erro ao verificar permissões no workspace');
      }

      if (!currentUserMembership) {
        console.log('useTeamManagement: User is not a member of this workspace');
        throw new Error('Você não tem permissão para ver os membros deste workspace');
      }

      // Agora buscar todos os membros do workspace
      console.log('useTeamManagement: User is member, fetching all workspace members...');
      
      const { data: workspaceMembers, error: membersError } = await supabase
        .from('workspace_members')
        .select(`
          id,
          workspace_id,
          user_id,
          role,
          joined_at
        `)
        .eq('workspace_id', currentWorkspace.id)
        .order('joined_at', { ascending: true });

      if (membersError) {
        console.error('useTeamManagement: Error fetching workspace members:', membersError);
        throw membersError;
      }

      console.log('useTeamManagement: Workspace members found:', workspaceMembers);

      if (!workspaceMembers || workspaceMembers.length === 0) {
        console.log('useTeamManagement: No workspace members found for workspace:', currentWorkspace.id);
        return [];
      }

      // Buscar perfis dos usuários
      const userIds = workspaceMembers.map(member => member.user_id);
      console.log('useTeamManagement: Fetching profiles for user IDs:', userIds);

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      if (profilesError) {
        console.error('useTeamManagement: Error fetching profiles:', profilesError);
        // Não falhar se não conseguir buscar perfis, apenas mostrar IDs
      }

      console.log('useTeamManagement: Profiles found:', profiles);

      // Combinar dados de membros com perfis
      const combinedData = workspaceMembers.map(member => {
        const profile = profiles?.find(p => p.id === member.user_id);
        const result = {
          id: member.id,
          workspace_id: member.workspace_id,
          user_id: member.user_id,
          role: member.role as UserRole,
          joined_at: member.joined_at,
          profiles: profile ? {
            email: profile.email,
            full_name: profile.full_name
          } : {
            email: `Usuário ${member.user_id.slice(0, 8)}... (perfil não encontrado)`,
            full_name: null
          }
        };
        console.log('useTeamManagement: Combined member data:', result);
        return result;
      });

      console.log('useTeamManagement: Final combined data:', combinedData);
      return combinedData as WorkspaceMember[];
    },
    enabled: !!currentWorkspace?.id && !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      console.log('useTeamManagement: Query retry attempt:', failureCount, 'Error:', error);
      return failureCount < 2; // Retry até 2 vezes
    }
  });

  console.log('useTeamManagement: Query result - members:', members, 'isLoading:', isLoading, 'error:', error);

  const currentUserMember = members.find(member => member.user_id === user?.id);
  const currentUserRole = currentUserMember?.role;

  const removeMember = async (memberId: string, memberUserId: string) => {
    if (memberUserId === user?.id) {
      toast.error('Você não pode remover a si mesmo do workspace.');
      return;
    }

    try {
      console.log('useTeamManagement: Removing member:', memberId);
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId);

      if (error) {
        console.error('useTeamManagement: Error removing member:', error);
        throw error;
      }

      toast.success('Membro removido com sucesso!');
      refetch();
    } catch (error: any) {
      console.error('useTeamManagement: Error removing member:', error);
      toast.error('Erro ao remover membro: ' + error.message);
    }
  };

  const updateRole = async (memberId: string, newRole: string) => {
    try {
      console.log('useTeamManagement: Updating role for member:', memberId, 'to:', newRole);
      const { error } = await supabase
        .from('workspace_members')
        .update({ role: newRole as UserRole })
        .eq('id', memberId);

      if (error) {
        console.error('useTeamManagement: Error updating role:', error);
        throw error;
      }

      toast.success('Permissão atualizada com sucesso!');
      refetch();
    } catch (error: any) {
      console.error('useTeamManagement: Error updating role:', error);
      toast.error('Erro ao atualizar permissão: ' + error.message);
    }
  };

  return {
    members,
    currentWorkspace,
    user,
    currentUserRole,
    refetch,
    removeMember,
    updateRole,
    isLoading,
    error,
  };
}
