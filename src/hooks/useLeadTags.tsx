
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useWorkspace } from './useWorkspace';

interface LeadTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
  workspace_id: string | null;
}

interface CreateTagData {
  name: string;
  color: string;
}

interface UpdateTagData {
  id: string;
  name: string;
  color: string;
}

export function useLeadTags() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['lead-tags', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Buscar workspace do usuário
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (workspaceError) {
        console.error('Workspace error:', workspaceError);
        throw workspaceError;
      }
      if (!workspaceData) return [];

      const { data, error } = await supabase
        .from('lead_tags')
        .select('*')
        .eq('workspace_id', workspaceData.workspace_id)
        .order('name');
      
      if (error) throw error;
      return data as LeadTag[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateLeadTag() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (tagData: CreateTagData) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Buscar workspace do usuário
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (workspaceError) {
        console.error('Workspace error:', workspaceError);
        throw workspaceError;
      }
      if (!workspaceData) throw new Error('Usuário não pertence a nenhum workspace');

      const { data, error } = await supabase
        .from('lead_tags')
        .insert({
          ...tagData,
          workspace_id: workspaceData.workspace_id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-tags'] });
      toast.success('Tag criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar tag: ' + error.message);
    },
  });
}

export function useUpdateLeadTag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, name, color }: UpdateTagData) => {
      const { data, error } = await supabase
        .from('lead_tags')
        .update({ name, color })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-tags'] });
      queryClient.invalidateQueries({ queryKey: ['lead-tag-relations'] });
      toast.success('Tag atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar tag: ' + error.message);
    },
  });
}

export function useDeleteLeadTag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from('lead_tags')
        .delete()
        .eq('id', tagId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-tags'] });
      queryClient.invalidateQueries({ queryKey: ['lead-tag-relations'] });
      toast.success('Tag excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir tag: ' + error.message);
    },
  });
}

export function useLeadTagRelations(leadId: string) {
  return useQuery({
    queryKey: ['lead-tag-relations', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_tag_relations')
        .select(`
          id,
          tag_id,
          lead_tags (
            id,
            name,
            color
          )
        `)
        .eq('lead_id', leadId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!leadId,
  });
}

export function useAddTagToLead() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  
  return useMutation({
    mutationFn: async ({ leadId, tagId }: { leadId: string; tagId: string }) => {
      const { data, error } = await supabase
        .from('lead_tag_relations')
        .insert({ lead_id: leadId, tag_id: tagId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ['lead-tag-relations', leadId] });
      toast.success('Tag adicionada ao lead!');
    },
    onError: (error) => {
      toast.error('Erro ao adicionar tag: ' + error.message);
    },
  });
}

export function useRemoveTagFromLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ leadId, tagId }: { leadId: string; tagId: string }) => {
      const { error } = await supabase
        .from('lead_tag_relations')
        .delete()
        .eq('lead_id', leadId)
        .eq('tag_id', tagId);
      
      if (error) throw error;
    },
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ['lead-tag-relations', leadId] });
      toast.success('Tag removida do lead!');
    },
    onError: (error) => {
      toast.error('Erro ao remover tag: ' + error.message);
    },
  });
}
