import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Pipeline {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  default_assignee: string | null;
  default_value: number | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  pipeline_stages?: {
    id: string;
    name: string;
    color: string;
    position: number;
  }[];
}

interface PipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
}

interface CreatePipelineData {
  workspace_id: string;
  name: string;
  description: string | null;
  default_assignee: string | null;
  default_value: number | null;
  is_default: boolean;
}

interface CreatePipelineStageData {
  pipeline_id: string;
  name: string;
  color: string;
  position: number;
}

interface UpdatePipelineStageData {
  id: string;
  name?: string;
  color?: string;
  position?: number;
}

interface ReorderStagesData {
  stages: { id: string; position: number }[];
}

interface UpdatePipelineData {
  id: string;
  name?: string;
  description?: string | null;
  default_assignee?: string | null;
  default_value?: number | null;
}

export function usePipelines(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['pipelines', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from('pipelines')
        .select(`
          *,
          pipeline_stages (
            id,
            name,
            color,
            position
          )
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Sort stages by position for each pipeline
      return (data as Pipeline[]).map(pipeline => ({
        ...pipeline,
        pipeline_stages: pipeline.pipeline_stages?.sort((a, b) => a.position - b.position) || []
      }));
    },
    enabled: !!workspaceId,
  });
}

export function usePipelineStages(pipelineId: string | undefined) {
  return useQuery({
    queryKey: ['pipeline-stages', pipelineId],
    queryFn: async () => {
      if (!pipelineId) return [];
      
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('position', { ascending: true });
      
      if (error) throw error;
      return data as PipelineStage[];
    },
    enabled: !!pipelineId,
  });
}

export function useCreatePipeline() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (pipelineData: CreatePipelineData) => {
      const { data, error } = await supabase
        .from('pipelines')
        .insert(pipelineData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      toast.success('Pipeline criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar pipeline: ' + error.message);
    },
  });
}

export function useCreatePipelineStage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (stageData: CreatePipelineStageData) => {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .insert(stageData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] });
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      toast.success('Etapa criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar etapa: ' + error.message);
    },
  });
}

export function useUpdatePipelineStage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updateData: UpdatePipelineStageData) => {
      const { id, ...data } = updateData;
      const { data: result, error } = await supabase
        .from('pipeline_stages')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] });
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      toast.success('Etapa atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar etapa: ' + error.message);
    },
  });
}

export function useDeletePipelineStage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (stageId: string) => {
      const { error } = await supabase
        .from('pipeline_stages')
        .delete()
        .eq('id', stageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] });
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      toast.success('Etapa excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir etapa: ' + error.message);
    },
  });
}

export function useReorderPipelineStages() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ stages }: { stages: { id: string; position: number }[] }) => {
      const updates = stages.map(stage => 
        supabase
          .from('pipeline_stages')
          .update({ position: stage.position })
          .eq('id', stage.id)
      );

      const results = await Promise.all(updates);
      
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error('Erro ao reordenar etapas');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] });
    },
    onError: (error) => {
      console.error('Erro ao reordenar etapas:', error);
      toast.error('Erro ao reordenar etapas');
    },
  });
}

export function useUpdatePipeline() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updateData: UpdatePipelineData) => {
      const { id, ...data } = updateData;
      const { data: result, error } = await supabase
        .from('pipelines')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      toast.success('Pipeline atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar pipeline: ' + error.message);
    },
  });
}

export function useDeletePipeline() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (pipelineId: string) => {
      // Primeiro, mover todos os leads para o pipeline padrão do workspace
      const { data: pipeline } = await supabase
        .from('pipelines')
        .select('workspace_id')
        .eq('id', pipelineId)
        .single();

      if (pipeline) {
        // Buscar o pipeline padrão do workspace
        const { data: defaultPipeline } = await supabase
          .from('pipelines')
          .select('id, pipeline_stages!inner(id)')
          .eq('workspace_id', pipeline.workspace_id)
          .eq('is_default', true)
          .neq('id', pipelineId) // Não o próprio pipeline
          .single();

        if (defaultPipeline && defaultPipeline.pipeline_stages?.length > 0) {
          // Mover todos os leads para o primeiro estágio do pipeline padrão
          const { error: updateError } = await supabase
            .from('leads')
            .update({
              pipeline_id: defaultPipeline.id,
              stage_id: defaultPipeline.pipeline_stages[0].id
            })
            .eq('pipeline_id', pipelineId);

          if (updateError) {
            throw new Error('Erro ao mover leads: ' + updateError.message);
          }
        }
      }

      // Agora deletar o pipeline (as etapas serão deletadas automaticamente via CASCADE)
      const { error } = await supabase
        .from('pipelines')
        .delete()
        .eq('id', pipelineId);

      if (error) {
        throw new Error('Erro ao deletar pipeline: ' + error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Pipeline excluído com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao deletar pipeline:', error);
      toast.error(error.message || 'Erro ao deletar pipeline');
    },
  });
}
