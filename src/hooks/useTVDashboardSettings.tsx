import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';
import { toast } from 'sonner';

export function useTVDashboardSettings() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['tv-dashboard-settings', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;

      const { data, error } = await supabase
        .from('tv_dashboard_settings')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      // Se não existe, criar com valores padrão
      if (!data) {
        const { data: newSettings, error: insertError } = await supabase
          .from('tv_dashboard_settings')
          .insert({
            workspace_id: currentWorkspace.id,
            revenue_goal: 100000,
            show_utm_chart: true,
            show_funnel: true,
            show_leaderboard: true,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return newSettings;
      }

      return data;
    },
    enabled: !!currentWorkspace?.id,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<typeof settings>) => {
      if (!currentWorkspace?.id) throw new Error('No workspace');

      const { data, error } = await supabase
        .from('tv_dashboard_settings')
        .update(updates)
        .eq('workspace_id', currentWorkspace.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tv-dashboard-settings'] });
      toast.success('Configurações atualizadas!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar configurações: ' + error.message);
    },
  });

  return {
    settings,
    isLoading,
    updateSettings: updateSettings.mutate,
  };
}
