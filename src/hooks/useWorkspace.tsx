import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEffect } from 'react';
import React from 'react';

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export function useWorkspaces() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['workspaces', user?.id],
    queryFn: async () => {
      if (!user) {
        return [];
      }
      
      console.log('Fetching workspaces for user:', user.id);
      
      // IMPORTANTE: Busca APENAS workspaces onde o usuário é membro explicitamente
      // Isso evita que super admins vejam todos os workspaces nas páginas normais
      // O painel de Super Admin tem sua própria lógica para listar todos
      const { data: memberWorkspaces, error: memberError } = await supabase
        .from('workspace_members')
        .select(`
          workspace_id,
          role,
          workspaces:workspace_id (
            id,
            name,
            description,
            owner_id,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id);
      
      if (memberError) {
        console.error('Error fetching member workspaces:', memberError);
        throw memberError;
      }

      // Extrair e formatar os workspaces
      const workspaces = memberWorkspaces
        ?.map(m => m.workspaces)
        .filter(Boolean)
        .sort((a, b) => (a?.name || '').localeCompare(b?.name || '')) || [];

      console.log('Found member workspaces:', workspaces);
      return workspaces as Workspace[];
    },
    enabled: !!user,
  });
}

export function useWorkspace() {
  const { data: workspaces = [], isLoading, error } = useWorkspaces();
  const { user } = useAuth();
  
  // Priorizar workspace PRÓPRIO do usuário (onde é owner)
  // Excluir workspace "superadmin" da seleção automática
  const workspace = React.useMemo(() => {
    console.log('useWorkspace - All workspaces:', workspaces);
    
    if (!workspaces || workspaces.length === 0) return undefined;
    
    // Filtrar workspaces especiais (superadmin)
    const regularWorkspaces = workspaces.filter(
      w => w.name !== 'superadmin' && w.id !== 'a0000000-0000-0000-0000-000000000001'
    );
    
    console.log('useWorkspace - Regular workspaces (filtered):', regularWorkspaces);
    
    // Se não houver workspaces regulares, usar o primeiro disponível
    if (regularWorkspaces.length === 0) return workspaces[0];
    
    // PRIMEIRO: workspace PRÓPRIO (onde É owner)
    const ownWorkspace = regularWorkspaces.find(w => w.owner_id === user?.id);
    if (ownWorkspace) {
      console.log('useWorkspace - Selected OWN workspace:', ownWorkspace);
      return ownWorkspace;
    }
    
    // SEGUNDO: workspace compartilhado
    console.log('useWorkspace - Selected shared workspace:', regularWorkspaces[0]);
    return regularWorkspaces[0];
  }, [workspaces, user?.id]);

  return {
    currentWorkspace: workspace,
    workspaces,
    isLoading,
    error,
  };
}

export function useEnsureDefaultWorkspace() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: workspaces = [], isLoading, error } = useWorkspaces();
  
  // Aplicar mesma lógica de useWorkspace() para selecionar workspace correto
  const workspace = React.useMemo(() => {
    if (!workspaces || workspaces.length === 0) return undefined;
    
    // Filtrar workspaces especiais (superadmin)
    const regularWorkspaces = workspaces.filter(
      w => w.name !== 'superadmin' && w.id !== 'a0000000-0000-0000-0000-000000000001'
    );
    
    if (regularWorkspaces.length === 0) return workspaces[0];
    
    // Priorizar workspace PRÓPRIO (onde é owner)
    const ownWorkspace = regularWorkspaces.find(w => w.owner_id === user?.id);
    if (ownWorkspace) return ownWorkspace;
    
    return regularWorkspaces[0];
  }, [workspaces, user?.id]);

  const createWorkspaceMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not found');

      console.log('Creating workspace for user:', user.id);

      const { data: existingWorkspaces } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1);

      if (existingWorkspaces && existingWorkspaces.length > 0) {
        console.log('Workspace already exists:', existingWorkspaces[0].id);
        await ensureWorkspaceMember(existingWorkspaces[0].id);
        return existingWorkspaces[0] as Workspace;
      }

      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          name: 'Meu Workspace',
          description: 'Workspace padrão',
          owner_id: user.id,
        })
        .select()
        .single();

      if (workspaceError) {
        console.error('Error creating workspace:', workspaceError);
        throw workspaceError;
      }

      console.log('Workspace created successfully:', workspaceData.id);
      
      // O trigger do banco (setup_default_workspace_data) já cria pipeline e job board
      await ensureWorkspaceMember(workspaceData.id);
      
      return workspaceData as Workspace;
    },
    onSuccess: (data) => {
      console.log('Workspace creation successful, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['workspaces', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      queryClient.invalidateQueries({ queryKey: ['job-boards'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      queryClient.setQueryData(['workspaces', user?.id], [data]);
    },
    onError: (error) => {
      console.error('useEnsureDefaultWorkspace: Workspace creation failed:', error);
    },
  });

  const ensureWorkspaceMember = async (workspaceId: string) => {
    if (!user) return;
    
    console.log('Ensuring workspace member for:', workspaceId, user.id);
    
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .limit(1);

    if (existingMember && existingMember.length > 0) {
      console.log('Workspace member already exists');
      return;
    }

    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspaceId,
        user_id: user.id,
        role: 'admin',
      });

    if (memberError) {
      console.error('Error creating workspace member:', memberError);
      throw memberError;
    }

    console.log('Workspace member created successfully');
  };

  // Removido: ensurePipelineExists e ensureJobBoardExists
  // O trigger do banco (setup_default_workspace_data) já cuida da criação de pipelines e job boards
  // Isso evita race conditions e duplicações

  // Auto-executar apenas para garantir que o usuário é membro do workspace
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!isLoading && user && workspace && !createWorkspaceMutation.isPending) {
        console.log('Workspace exists, ensuring workspace member');
        ensureWorkspaceMember(workspace.id).catch(error => {
          console.error('Failed to ensure workspace member:', error);
        });
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [isLoading, user, workspace?.id]);

  const ensureWorkspace = async () => {
    if (!isLoading && user) {
      if (!workspace) {
        console.log('No workspace found, creating default workspace');
        try {
          await createWorkspaceMutation.mutateAsync();
        } catch (error) {
          console.error('useEnsureDefaultWorkspace: Failed to create workspace:', error);
        }
      } else {
        console.log('Workspace exists, ensuring workspace member');
        try {
          await ensureWorkspaceMember(workspace.id);
          queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
        } catch (error) {
          console.error('useEnsureDefaultWorkspace: Failed to ensure workspace member:', error);
        }
      }
    }
  };

  return {
    workspace,
    workspaces,
    isLoading: isLoading || createWorkspaceMutation.isPending,
    error: error || createWorkspaceMutation.error,
    ensureWorkspace,
    isCreating: createWorkspaceMutation.isPending,
  };
}

export function useCreateWorkspaceWithName() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (workspaceName: string) => {
      if (!user) throw new Error('User not found');

      console.log('🏢 Criando workspace via RPC:', workspaceName);

      // Chamar a função SECURITY DEFINER que cria o workspace e todos os recursos padrão
      const { data: workspaceId, error: rpcError } = await supabase
        .rpc('create_workspace_for_user', {
          p_workspace_name: workspaceName,
          p_user_id: user.id,
        });

      if (rpcError) {
        console.error('❌ Erro ao criar workspace via RPC:', rpcError);
        throw rpcError;
      }

      console.log('✅ Workspace criado via RPC com ID:', workspaceId);

      // Buscar o workspace criado para retornar os dados completos
      const { data: workspaceData, error: fetchError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();

      if (fetchError) {
        console.error('❌ Erro ao buscar workspace:', fetchError);
        throw fetchError;
      }

      console.log('🎉 Workspace completo criado com sucesso!');
      return workspaceData as Workspace;
    },
    onSuccess: (data) => {
      console.log('✅ Workspace creation successful, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['workspaces', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      queryClient.invalidateQueries({ queryKey: ['job-boards'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      queryClient.invalidateQueries({ queryKey: ['lead_tags'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-access'] });
      queryClient.setQueryData(['workspaces', user?.id], [data]);
    },
    onError: (error) => {
      console.error('❌ Failed to create workspace:', error);
    },
  });

  return {
    createWorkspaceWithName: (name: string) => createMutation.mutate(name),
    isCreating: createMutation.isPending,
    error: createMutation.error,
  };
}
