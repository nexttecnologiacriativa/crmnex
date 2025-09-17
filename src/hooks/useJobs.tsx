import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useEnsureDefaultWorkspace } from './useWorkspace';

export interface Job {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  status: string; // Permite status customizados
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to: string | null;
  created_by: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  tags: string[];
  estimated_hours: number | null;
  actual_hours: number | null;
  board_id: string | null;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
  creator?: {
    full_name: string;
    email: string;
  } | null;
  job_boards?: {
    name: string;
    color: string;
  } | null;
}

export interface JobBoard {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  color: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobSubtask {
  id: string;
  job_id: string;
  title: string;
  completed: boolean;
  created_at: string;
  due_date?: string | null;
  completed_at?: string | null;
  assigned_to?: string | null;
}

export interface JobTimeLog {
  id: string;
  job_id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  hours: number | null;
  description: string | null;
  created_at: string;
}

export interface JobComment {
  id: string;
  job_id: string;
  user_id: string;
  content: string;
  mentioned_users: string[];
  created_at: string;
  user?: {
    full_name: string;
    email: string;
  };
}

export type JobStatus = 'todo' | 'in_progress' | 'review' | 'done' | string; // Permite status customizados
export type JobPriority = 'low' | 'medium' | 'high' | 'urgent';

export function useJobs(boardId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['jobs', boardId],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('jobs')
        .select(`
          *,
          assigned_profile:profiles!jobs_assigned_to_fkey(full_name, email),
          creator_profile:profiles!jobs_created_by_fkey(full_name, email),
          job_boards(name, color)
        `)
        .order('created_at', { ascending: false });

      if (boardId) {
        query = query.eq('board_id', boardId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform the data to match our Job interface
      const transformedData = (data || []).map(job => ({
        ...job,
        profiles: job.assigned_profile,
        creator: job.creator_profile,
        assigned_profile: undefined,
        creator_profile: undefined,
      }));
      
      return transformedData as Job[];
    },
    enabled: !!user?.id,
  });
}

export function useJobsByStatus(boardId?: string | null) {
  const { data: jobs = [] } = useJobs(boardId);

  // Jobs sem status ou com status inválido vão para "todo"
  const jobsWithValidStatus = jobs.map(job => ({
    ...job,
    status: job.status || 'todo'
  }));

  return {
    todo: jobsWithValidStatus.filter(job => job.status === 'todo'),
    in_progress: jobsWithValidStatus.filter(job => job.status === 'in_progress'),
    review: jobsWithValidStatus.filter(job => job.status === 'review'),
    done: jobsWithValidStatus.filter(job => job.status === 'done'),
    // Incluir todos os jobs para permitir acesso aos customizados
    all: jobsWithValidStatus,
  };
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          assigned_profile:profiles!jobs_assigned_to_fkey(full_name, email),
          creator_profile:profiles!jobs_created_by_fkey(full_name, email),
          job_boards(name, color)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Transform the data to match our Job interface
      const transformedData = {
        ...data,
        profiles: data.assigned_profile,
        creator: data.creator_profile,
        assigned_profile: undefined,
        creator_profile: undefined,
      };
      
      return transformedData as Job;
    },
    enabled: !!id,
  });
}

export function useJobBoards() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['job-boards'],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('job_boards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as JobBoard[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateJobBoard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (boardData: Omit<JobBoard, 'id' | 'created_at' | 'updated_at' | 'workspace_id'>) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Buscar workspace do usuário
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (workspaceError) throw workspaceError;
      if (!workspaceData) throw new Error('Usuário não pertence a nenhum workspace');

      const { data, error } = await supabase
        .from('job_boards')
        .insert({
          ...boardData,
          workspace_id: workspaceData.workspace_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as JobBoard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-boards'] });
      toast.success('Board criado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar board: ' + error.message);
    },
  });
}

export function useUpdateJobBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (boardData: Partial<JobBoard> & { id: string }) => {
      const { data, error } = await supabase
        .from('job_boards')
        .update(boardData)
        .eq('id', boardData.id)
        .select()
        .single();

      if (error) throw error;
      return data as JobBoard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-boards'] });
      toast.success('Board atualizado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar board: ' + error.message);
    },
  });
}

export function useDeleteJobBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Primeiro, mover todos os jobs deste board para null (sem board)
      await supabase
        .from('jobs')
        .update({ board_id: null })
        .eq('board_id', id);

      const { data, error } = await supabase
        .from('job_boards')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as JobBoard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-boards'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Board excluído!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir board: ' + error.message);
    },
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (jobData: Omit<Job, 'id' | 'created_at' | 'updated_at' | 'workspace_id' | 'created_by' | 'completed_at' | 'actual_hours'>) => {
      console.log('Creating job with data:', jobData);
      
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Buscar workspace do usuário
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (workspaceError) {
        console.error('Workspace error:', workspaceError);
        throw workspaceError;
      }
      
      if (!workspaceData) {
        console.error('User does not belong to any workspace');
        throw new Error('Usuário não pertence a nenhum workspace');
      }

      const insertData = {
        ...jobData,
        workspace_id: workspaceData.workspace_id,
        created_by: user.id,
        actual_hours: null,
        completed_at: null,
      };

      console.log('Inserting job data:', insertData);

      const { data, error } = await supabase
        .from('jobs')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Job creation error:', error);
        throw error;
      }
      
      console.log('Job created successfully:', data);
      return data as Job;
    },
    onSuccess: (data) => {
      console.log('Job creation success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', data.board_id] });
      toast.success('Job criado!');
    },
    onError: (error: any) => {
      console.error('Job creation mutation error:', error);
      toast.error('Erro ao criar job: ' + error.message);
    },
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobData: Partial<Job> & { id: string }) => {
      console.log('Updating job with data:', jobData);
      
      const { data, error } = await supabase
        .from('jobs')
        .update(jobData)
        .eq('id', jobData.id)
        .select()
        .single();

      if (error) {
        console.error('Job update error:', error);
        throw error;
      }
      
      console.log('Job updated successfully:', data);
      return data as Job;
    },
    onSuccess: (data) => {
      console.log('Job update success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', data.board_id] });
      toast.success('Job atualizado!');
    },
    onError: (error: any) => {
      console.error('Job update mutation error:', error);
      toast.error('Erro ao atualizar job: ' + error.message);
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job excluído!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir job: ' + error.message);
    },
  });
}

export function useJobSubtasks(jobId: string) {
  return useQuery({
    queryKey: ['job-subtasks', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_subtasks')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as JobSubtask[];
    },
    enabled: !!jobId,
  });
}

export function useJobTimeLogs(jobId: string) {
  return useQuery({
    queryKey: ['job-time-logs', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_time_logs')
        .select('*')
        .eq('job_id', jobId)
        .order('start_time', { ascending: false });

      if (error) throw error;
      return data as JobTimeLog[];
    },
    enabled: !!jobId,
  });
}

export function useJobComments(jobId: string) {
  return useQuery({
    queryKey: ['job-comments', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_comments')
        .select(`
          *,
          user:profiles(full_name, email)
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as JobComment[];
    },
    enabled: !!jobId,
  });
}

export function useStartTimeTracking() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ job_id }: { job_id: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      console.log('Starting time tracking for job:', job_id);

      const { data, error } = await supabase
        .from('job_time_logs')
        .insert({
          job_id: job_id,
          user_id: user.id,
          start_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error starting time tracking:', error);
        throw error;
      }
      
      console.log('Time tracking started:', data);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['job-time-logs', data.job_id] });
      queryClient.invalidateQueries({ queryKey: ['active-time-log', data.job_id] });
      toast.success('Contador iniciado!');
    },
    onError: (error: any) => {
      console.error('Start time tracking error:', error);
      toast.error('Erro ao iniciar contador: ' + error.message);
    },
  });
}

export function useStopTimeTracking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, jobId, description }: { id: string; jobId: string; description?: string }) => {
      const endTime = new Date().toISOString();
      
      // Buscar o registro para calcular as horas
      const { data: timeLog, error: fetchError } = await supabase
        .from('job_time_logs')
        .select('start_time')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      const startTime = new Date(timeLog.start_time);
      const endTimeDate = new Date(endTime);
      const diffInMs = endTimeDate.getTime() - startTime.getTime();
      // Converter para horas com precisão de segundos (6 casas decimais)
      const hours = Math.round((diffInMs / (1000 * 60 * 60)) * 1000000) / 1000000;
      
      console.log('Calculando horas com precisão:', {
        startTime: timeLog.start_time,
        endTime,
        diffInMs,
        hours,
        diffInSeconds: diffInMs / 1000,
        diffInMinutes: diffInMs / (1000 * 60)
      });
      
      const { data, error } = await supabase
        .from('job_time_logs')
        .update({
          end_time: endTime,
          hours: hours,
          description: description || null,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['job-time-logs', data.job_id] });
      queryClient.invalidateQueries({ queryKey: ['active-time-log', data.job_id] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Contador parado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao parar contador: ' + error.message);
    },
  });
}

export function useActiveTimeLog(jobId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['active-time-log', jobId],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('job_time_logs')
        .select('*')
        .eq('job_id', jobId)
        .eq('user_id', user.id)
        .is('end_time', null)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar active time log:', error);
        return null;
      }

      return data as JobTimeLog | null;
    },
    enabled: !!jobId && !!user?.id,
    refetchInterval: 1000, // Atualizar a cada segundo
  });
}

export function useDeleteJobSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, job_id }: { id: string; job_id: string }) => {
      const { data, error } = await supabase
        .from('job_subtasks')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['job-subtasks', data.job_id] });
      toast.success('Subtarefa excluída!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir subtarefa: ' + error.message);
    },
  });
}

export function useUpdateJobSubtask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, job_id, ...data }: Partial<JobSubtask> & { id: string; job_id: string; completed_at?: string | null }) => {
      console.log('Updating subtask with data:', data);
      
      const { data: result, error } = await supabase
        .from('job_subtasks')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Subtask update error:', error);
        throw error;
      }
      
      console.log('Subtask updated successfully:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Subtask update success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['job-subtasks', data.job_id] });
      toast.success('Subtarefa atualizada!');
    },
    onError: (error: any) => {
      console.error('Subtask update mutation error:', error);
      toast.error('Erro ao atualizar subtarefa: ' + error.message);
    },
  });
}

export function useCreateJobSubtask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (subtaskData: Omit<JobSubtask, 'id' | 'created_at'> & { due_date?: string | null; assigned_to?: string | null }) => {
      console.log('Creating subtask with data:', subtaskData);
      
      const { data, error } = await supabase
        .from('job_subtasks')
        .insert(subtaskData)
        .select()
        .single();
      
      if (error) {
        console.error('Subtask creation error:', error);
        throw error;
      }
      
      console.log('Subtask created successfully:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('Subtask creation success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['job-subtasks', data.job_id] });
      toast.success('Subtarefa criada!');
    },
    onError: (error: any) => {
      console.error('Subtask creation mutation error:', error);
      toast.error('Erro ao criar subtarefa: ' + error.message);
    },
  });
}

export function useCreateJobComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ job_id, content, mentioned_users }: { job_id: string; content: string; mentioned_users: string[] }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('job_comments')
        .insert({
          job_id,
          user_id: user.id,
          content,
          mentioned_users,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['job-comments', data.job_id] });
      toast.success('Comentário adicionado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao adicionar comentário: ' + error.message);
    },
  });
}

export function useWorkspaceMembers() {
  const { workspace } = useEnsureDefaultWorkspace();
  
  return useQuery({
    queryKey: ['workspace-members', workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          user_id,
          role,
          profiles (
            id,
            full_name,
            email
          )
        `)
        .eq('workspace_id', workspace.id);
      
      if (error) throw error;
      
      return data?.map(member => ({
        id: member.profiles?.id || '',
        full_name: member.profiles?.full_name || '',
        email: member.profiles?.email || '',
        role: member.role,
      })) || [];
    },
    enabled: !!workspace?.id,
  });
}

export function useDeleteJobTimeLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('job_time_logs')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['job-time-logs', data.job_id] });
      toast.success('Registro de tempo excluído!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir registro de tempo: ' + error.message);
    },
  });
}
