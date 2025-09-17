
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface CustomField {
  id: string;
  workspace_id: string;
  name: string;
  field_type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  options?: any;
  is_required: boolean;
  created_at: string;
}

interface CreateCustomFieldData {
  workspace_id: string;
  name: string;
  field_type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  options?: any;
  is_required?: boolean;
}

export function useCustomFields(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['custom-fields', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as CustomField[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateCustomField() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (fieldData: CreateCustomFieldData) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('custom_fields')
        .insert(fieldData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { workspace_id }) => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', workspace_id] });
      toast.success('Campo personalizado criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar campo personalizado: ' + error.message);
    },
  });
}

export function useDeleteCustomField() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, workspace_id }: { id: string; workspace_id: string }) => {
      const { error } = await supabase
        .from('custom_fields')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { workspace_id };
    },
    onSuccess: (_, { workspace_id }) => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', workspace_id] });
      toast.success('Campo personalizado removido com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao remover campo personalizado: ' + error.message);
    },
  });
}
