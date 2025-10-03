import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEffect } from 'react';

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
      
      // Corrigido: Busca todos os workspaces aos quais o usuário pertence (via RLS),
      // em vez de apenas os que ele possui.
      const { data: memberWorkspaces, error: memberError } = await supabase
        .from('workspaces')
        .select('*');
      
      if (memberError) {
        console.error('Error fetching member workspaces:', memberError);
        throw memberError;
      }

      console.log('Found member workspaces:', memberWorkspaces);
      return memberWorkspaces || [];
    },
    enabled: !!user,
  });
}

export function useWorkspace() {
  const { data: workspaces = [], isLoading, error } = useWorkspaces();
  const workspace = workspaces[0];

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
  const workspace = workspaces[0];

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
        await ensurePipelineExists(existingWorkspaces[0].id);
        await ensureJobBoardExists(existingWorkspaces[0].id);
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
      
      await ensureWorkspaceMember(workspaceData.id);
      await ensurePipelineExists(workspaceData.id);
      await ensureJobBoardExists(workspaceData.id);
      
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

  const ensurePipelineExists = async (workspaceId: string) => {
    console.log('Checking for default pipeline in workspace:', workspaceId);
    
    // Usar uma chave única para evitar execuções simultâneas
    const lockKey = `pipeline_creation_${workspaceId}`;
    const existingLock = sessionStorage.getItem(lockKey);
    
    if (existingLock && Date.now() - parseInt(existingLock) < 5000) {
      console.log('Pipeline creation already in progress for workspace:', workspaceId);
      return;
    }
    
    // Definir lock por 5 segundos
    sessionStorage.setItem(lockKey, Date.now().toString());
    
    try {
      const { data: existingPipelines } = await supabase
        .from('pipelines')
        .select('id')
        .eq('workspace_id', workspaceId)
        .limit(1);

      if (existingPipelines && existingPipelines.length > 0) {
        console.log('Pipeline already exists for workspace:', workspaceId);
        return;
      }

      console.log('Creating default pipeline for workspace:', workspaceId);
      
      const { data: pipelineData, error: pipelineError } = await supabase
        .from('pipelines')
        .insert({
          workspace_id: workspaceId,
          name: 'Pipeline de Vendas',
          description: 'Pipeline padrão para gestão de leads',
          is_default: true,
        })
        .select()
        .single();

      if (pipelineError) {
        console.error('Error creating pipeline:', pipelineError);
        throw pipelineError;
      }

      console.log('Pipeline created:', pipelineData.id);

      const stages = [
        { name: 'Novo Lead', color: '#3b82f6', position: 0 },
        { name: 'Contato Inicial', color: '#8b5cf6', position: 1 },
        { name: 'Qualificado', color: '#06b6d4', position: 2 },
        { name: 'Proposta', color: '#f59e0b', position: 3 },
        { name: 'Negociação', color: '#ef4444', position: 4 },
        { name: 'Fechado', color: '#10b981', position: 5 },
      ];

      const stageInserts = stages.map(stage => ({
        pipeline_id: pipelineData.id,
        ...stage,
      }));

      const { error: stagesError } = await supabase
        .from('pipeline_stages')
        .insert(stageInserts);

      if (stagesError) {
        console.error('Error creating pipeline stages:', stagesError);
        throw stagesError;
      }

      console.log('Pipeline stages created successfully');
    } finally {
      // Remover lock após execução
      sessionStorage.removeItem(lockKey);
    }
  };

  const ensureJobBoardExists = async (workspaceId: string) => {
    console.log('Checking for default job board in workspace:', workspaceId);
    
    // Usar uma chave única para evitar execuções simultâneas
    const lockKey = `job_board_creation_${workspaceId}`;
    const existingLock = sessionStorage.getItem(lockKey);
    
    if (existingLock && Date.now() - parseInt(existingLock) < 5000) {
      console.log('Job board creation already in progress for workspace:', workspaceId);
      return;
    }
    
    // Definir lock por 5 segundos
    sessionStorage.setItem(lockKey, Date.now().toString());
    
    try {
      // Verificação mais robusta para evitar duplicação
      const { data: existingBoards, error: checkError } = await supabase
        .from('job_boards')
        .select('id, name')
        .eq('workspace_id', workspaceId);

      if (checkError) {
        console.error('Error checking existing job boards:', checkError);
        return;
      }

      if (existingBoards && existingBoards.length > 0) {
        console.log('Job board already exists for workspace:', workspaceId, existingBoards.length, 'boards found');
        return;
      }

      console.log('Creating default job board for workspace:', workspaceId);
      
      const { data: boardData, error: boardError } = await supabase
        .from('job_boards')
        .insert({
          workspace_id: workspaceId,
          name: 'Board Padrão',
          description: 'Board padrão para jobs',
          color: '#3b82f6',
          is_default: false,
        })
        .select()
        .single();

      if (boardError) {
        console.error('Error creating job board:', boardError);
        throw boardError;
      }

      console.log('Job board created:', boardData.id);
    } finally {
      // Remover lock após execução
      sessionStorage.removeItem(lockKey);
    }
  };

  // Auto-executar apenas para garantir recursos do workspace existente
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!isLoading && user && workspace && !createWorkspaceMutation.isPending) {
        console.log('Workspace exists, ensuring pipeline and job board exist');
        Promise.all([
          ensurePipelineExists(workspace.id),
          ensureJobBoardExists(workspace.id),
          ensureWorkspaceMember(workspace.id)
        ]).catch(error => {
          console.error('Failed to ensure workspace resources:', error);
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
        console.log('Workspace exists, ensuring workspace member, pipeline and job board exist');
        try {
          await ensureWorkspaceMember(workspace.id);
          await ensurePipelineExists(workspace.id);
          await ensureJobBoardExists(workspace.id);
          queryClient.invalidateQueries({ queryKey: ['pipelines'] });
          queryClient.invalidateQueries({ queryKey: ['job-boards'] });
          queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
        } catch (error) {
          console.error('useEnsureDefaultWorkspace: Failed to ensure workspace member/pipeline/job board:', error);
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

      console.log('Creating workspace with name:', workspaceName);

      // 1. Criar o workspace
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          name: workspaceName,
          description: 'Workspace criado via onboarding',
          owner_id: user.id,
        })
        .select()
        .single();

      if (workspaceError) {
        console.error('Error creating workspace:', workspaceError);
        throw workspaceError;
      }

      console.log('Workspace created:', workspaceData.id);

      // 2. Criar workspace_member (admin)
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspaceData.id,
          user_id: user.id,
          role: 'admin',
        });

      if (memberError) {
        console.error('Error creating workspace member:', memberError);
        throw memberError;
      }

      // 3. Criar pipeline padrão com estágios
      const { data: pipelineData, error: pipelineError } = await supabase
        .from('pipelines')
        .insert({
          workspace_id: workspaceData.id,
          name: 'Pipeline de Vendas',
          description: 'Pipeline padrão para gestão de leads',
          is_default: true,
        })
        .select()
        .single();

      if (pipelineError) {
        console.error('Error creating pipeline:', pipelineError);
        throw pipelineError;
      }

      // 4. Criar estágios do pipeline
      const stages = [
        { name: 'Novo Lead', color: '#3b82f6', position: 0 },
        { name: 'Contato Inicial', color: '#8b5cf6', position: 1 },
        { name: 'Qualificado', color: '#06b6d4', position: 2 },
        { name: 'Proposta', color: '#f59e0b', position: 3 },
        { name: 'Negociação', color: '#ef4444', position: 4 },
        { name: 'Fechado', color: '#10b981', position: 5 },
      ];

      const stageInserts = stages.map(stage => ({
        pipeline_id: pipelineData.id,
        ...stage,
      }));

      const { error: stagesError } = await supabase
        .from('pipeline_stages')
        .insert(stageInserts);

      if (stagesError) {
        console.error('Error creating pipeline stages:', stagesError);
        throw stagesError;
      }

      // 5. Criar tags padrão
      const tags = [
        { name: 'Quente', color: '#ef4444' },
        { name: 'Morno', color: '#f59e0b' },
        { name: 'Frio', color: '#06b6d4' },
        { name: 'Qualificado', color: '#10b981' },
        { name: 'Interessado', color: '#8b5cf6' },
      ];

      const tagInserts = tags.map(tag => ({
        workspace_id: workspaceData.id,
        ...tag,
      }));

      const { error: tagsError } = await supabase
        .from('lead_tags')
        .insert(tagInserts);

      if (tagsError) {
        console.error('Error creating tags:', tagsError);
        throw tagsError;
      }

      // 6. Criar job board padrão
      const { error: boardError } = await supabase
        .from('job_boards')
        .insert({
          workspace_id: workspaceData.id,
          name: 'Board Padrão',
          description: 'Board padrão para jobs',
          color: '#3b82f6',
          is_default: true,
        });

      if (boardError) {
        console.error('Error creating job board:', boardError);
        throw boardError;
      }

      // 7. Criar marketing_settings
      const { error: marketingError } = await supabase
        .from('marketing_settings')
        .insert({
          workspace_id: workspaceData.id,
          default_api_type: 'whatsapp_official',
          max_messages_per_minute: 30,
          evolution_message_interval: 2,
        });

      if (marketingError) {
        console.error('Error creating marketing settings:', marketingError);
        throw marketingError;
      }

      // 8. Criar debriefing_settings
      const { error: debriefingError } = await supabase
        .from('debriefing_settings')
        .insert({
          workspace_id: workspaceData.id,
          fixed_cost: 0,
          tax_percentage: 0,
        });

      if (debriefingError) {
        console.error('Error creating debriefing settings:', debriefingError);
        throw debriefingError;
      }

      // 9. Criar account_status
      const { error: accountError } = await supabase
        .from('account_status')
        .insert({
          workspace_id: workspaceData.id,
          is_active: true,
        });

      if (accountError) {
        console.error('Error creating account status:', accountError);
        throw accountError;
      }

      console.log('Workspace fully configured:', workspaceData.id);
      return workspaceData as Workspace;
    },
    onSuccess: (data) => {
      console.log('Workspace creation successful, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['workspaces', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      queryClient.invalidateQueries({ queryKey: ['job-boards'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      queryClient.invalidateQueries({ queryKey: ['lead_tags'] });
      queryClient.setQueryData(['workspaces', user?.id], [data]);
    },
    onError: (error) => {
      console.error('Failed to create workspace:', error);
    },
  });

  return {
    createWorkspaceWithName: (name: string) => createMutation.mutate(name),
    isCreating: createMutation.isPending,
    error: createMutation.error,
  };
}
