
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWorkspace } from './useWorkspace';

interface Task {
  id: string;
  workspace_id: string;
  lead_id: string | null;
  assigned_to: string;
  created_by: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    email?: string;
  };
  leads?: {
    name: string;
  };
}

interface CreateTaskData {
  workspace_id: string;
  assigned_to: string;
  created_by: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  lead_id?: string | null;
}

interface UpdateTaskData {
  id: string;
  title?: string;
  description?: string | null;
  due_date?: string | null;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to?: string | null;
  completed_at?: string | null;
}

export function useTasks() {
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ['tasks', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      
      console.log('Fetching tasks for workspace:', currentWorkspace.id);
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          profiles:profiles!tasks_assigned_to_fkey (
            full_name,
            email
          ),
          leads (
            name
          )
        `)
        .eq('workspace_id', currentWorkspace.id)
        .order('due_date', { ascending: true, nullsFirst: false });
      
      if (error) {
        console.error('Error fetching tasks:', error);
        throw error;
      }
      
      console.log('Tasks fetched successfully:', data?.length || 0);
      return data as Task[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  
  return useMutation({
    mutationFn: async (taskData: CreateTaskData) => {
      console.log('Creating task with data:', taskData);
      
      // Garantir que o workspace_id está presente
      if (!taskData.workspace_id && currentWorkspace?.id) {
        taskData.workspace_id = currentWorkspace.id;
      }
      
      if (!taskData.workspace_id) {
        throw new Error('Workspace ID é obrigatório para criar uma tarefa');
      }
      
      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating task:', error);
        throw error;
      }
      
      console.log('Task created successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa criada com sucesso!');
    },
    onError: (error) => {
      console.error('Create task error:', error);
      toast.error('Erro ao criar tarefa: ' + error.message);
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updateData: UpdateTaskData) => {
      const { id, ...data } = updateData;
      console.log('Updating task:', id, 'with data:', data);
      
      const { data: result, error } = await supabase
        .from('tasks')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating task:', error);
        throw error;
      }
      
      console.log('Task updated successfully:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa atualizada com sucesso!');
    },
    onError: (error) => {
      console.error('Update task error:', error);
      toast.error('Erro ao atualizar tarefa: ' + error.message);
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting task:', id);
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting task:', error);
        throw error;
      }
      
      console.log('Task deleted successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa excluída com sucesso!');
    },
    onError: (error) => {
      console.error('Delete task error:', error);
      toast.error('Erro ao excluir tarefa: ' + error.message);
    },
  });
}
