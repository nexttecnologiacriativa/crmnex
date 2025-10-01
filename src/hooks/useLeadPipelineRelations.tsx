import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LeadPipelineRelation {
  id: string;
  lead_id: string;
  pipeline_id: string;
  stage_id: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

interface AddLeadToPipelineData {
  lead_id: string;
  pipeline_id: string;
  stage_id: string;
  is_primary?: boolean;
}

interface UpdateLeadPipelineData {
  lead_id: string;
  pipeline_id: string;
  stage_id: string;
}

export function useLeadPipelineRelations(leadId: string | undefined) {
  return useQuery({
    queryKey: ['lead-pipeline-relations', leadId],
    queryFn: async () => {
      if (!leadId) return [];

      const { data, error } = await supabase
        .from('lead_pipeline_relations')
        .select(`
          *,
          pipelines (
            id,
            name,
            description
          ),
          pipeline_stages (
            id,
            name,
            color
          )
        `)
        .eq('lead_id', leadId)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      return data as LeadPipelineRelation[];
    },
    enabled: !!leadId,
  });
}

export function useAddLeadToPipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddLeadToPipelineData) => {
      // Primeiro, verificar se o lead já tem algum relacionamento
      const { data: existingRelations } = await supabase
        .from('lead_pipeline_relations')
        .select('*')
        .eq('lead_id', data.lead_id);

      // Se não tiver nenhum relacionamento e is_primary não foi especificado, criar como primário
      const isPrimary = existingRelations?.length === 0 ? true : (data.is_primary || false);

      // Inserir o novo relacionamento
      const { data: result, error } = await supabase
        .from('lead_pipeline_relations')
        .insert({ ...data, is_primary: isPrimary })
        .select()
        .single();

      if (error) throw error;

      // Se for primário, atualizar a tabela leads também
      if (isPrimary) {
        await supabase
          .from('leads')
          .update({ pipeline_id: data.pipeline_id, stage_id: data.stage_id })
          .eq('id', data.lead_id);
      }

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-pipeline-relations', variables.lead_id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-leads'] });
      toast.success('Lead adicionado ao pipeline!');
    },
    onError: (error: any) => {
      toast.error('Erro ao adicionar lead ao pipeline: ' + error.message);
    },
  });
}

export function useUpdateLeadPipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateLeadPipelineData) => {
      const { data: result, error } = await supabase
        .from('lead_pipeline_relations')
        .update({ stage_id: data.stage_id, updated_at: new Date().toISOString() })
        .eq('lead_id', data.lead_id)
        .eq('pipeline_id', data.pipeline_id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-pipeline-relations', variables.lead_id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-leads'] });
      toast.success('Pipeline do lead atualizado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar pipeline: ' + error.message);
    },
  });
}

export function useRemoveLeadFromPipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lead_id, pipeline_id }: { lead_id: string; pipeline_id: string }) => {
      const { error } = await supabase
        .from('lead_pipeline_relations')
        .delete()
        .eq('lead_id', lead_id)
        .eq('pipeline_id', pipeline_id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-pipeline-relations', variables.lead_id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-leads'] });
      toast.success('Lead removido do pipeline!');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover lead do pipeline: ' + error.message);
    },
  });
}

export function useSetPrimaryPipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lead_id, pipeline_id }: { lead_id: string; pipeline_id: string }) => {
      // Primeiro, obter o stage_id do relacionamento que será primário
      const { data: relationData } = await supabase
        .from('lead_pipeline_relations')
        .select('stage_id')
        .eq('lead_id', lead_id)
        .eq('pipeline_id', pipeline_id)
        .single();

      if (!relationData) throw new Error('Relacionamento não encontrado');

      // Remover is_primary de todos os outros relacionamentos
      await supabase
        .from('lead_pipeline_relations')
        .update({ is_primary: false })
        .eq('lead_id', lead_id);

      // Definir o novo como primário
      const { data, error } = await supabase
        .from('lead_pipeline_relations')
        .update({ is_primary: true })
        .eq('lead_id', lead_id)
        .eq('pipeline_id', pipeline_id)
        .select()
        .single();

      if (error) throw error;

      // Atualizar também a tabela leads para manter sincronizado
      await supabase
        .from('leads')
        .update({ 
          pipeline_id,
          stage_id: relationData.stage_id 
        })
        .eq('id', lead_id);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-pipeline-relations', variables.lead_id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-leads'] });
      toast.success('Pipeline principal atualizado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao definir pipeline principal: ' + error.message);
    },
  });
}
