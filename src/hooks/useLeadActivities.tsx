
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface LeadActivity {
  id: string;
  lead_id: string;
  user_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  metadata: any;
  created_at: string;
}

interface CreateActivityData {
  lead_id: string;
  activity_type: string;
  title: string;
  description?: string;
  metadata?: any;
}

interface UpdateActivityData {
  id: string;
  title: string;
  description: string;
  activity_type: string;
}

export function useLeadActivities(leadId: string) {
  return useQuery({
    queryKey: ['lead-activities', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_activities')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as LeadActivity[];
    },
    enabled: !!leadId,
  });
}

export function useCreateLeadActivity() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (activityData: CreateActivityData) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('lead_activities')
        .insert({
          ...activityData,
          user_id: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { lead_id }) => {
      queryClient.invalidateQueries({ queryKey: ['lead-activities', lead_id] });
      toast.success('Atividade criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar atividade: ' + error.message);
    },
  });
}

export function useUpdateLeadActivity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (activityData: UpdateActivityData) => {
      const { data, error } = await supabase
        .from('lead_activities')
        .update({
          title: activityData.title,
          description: activityData.description,
          activity_type: activityData.activity_type,
        })
        .eq('id', activityData.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lead-activities', data.lead_id] });
      toast.success('Atividade atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar atividade: ' + error.message);
    },
  });
}

export function useDeleteLeadActivity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (activityId: string) => {
      // Primeiro buscar a atividade para ter o lead_id
      const { data: activity, error: fetchError } = await supabase
        .from('lead_activities')
        .select('lead_id')
        .eq('id', activityId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const { error } = await supabase
        .from('lead_activities')
        .delete()
        .eq('id', activityId);
      
      if (error) throw error;
      return activity.lead_id;
    },
    onSuccess: (leadId) => {
      queryClient.invalidateQueries({ queryKey: ['lead-activities', leadId] });
      toast.success('Atividade excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir atividade: ' + error.message);
    },
  });
}
