
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWorkspaces } from './useWorkspace';
import { useNavigate } from 'react-router-dom';

export function useWorkspaceReset() {
  const queryClient = useQueryClient();
  const { data: workspaces } = useWorkspaces();
  const currentWorkspace = workspaces?.[0];
  const navigate = useNavigate();

  const resetWorkspaceMutation = useMutation({
    mutationFn: async (workspaceId: string) => {
      if (!workspaceId) throw new Error('Workspace ID não encontrado');

      // @ts-ignore - The reset_workspace function is new and might not be in the generated types yet.
      const { error } = await supabase.rpc('reset_workspace', {
        p_workspace_id: workspaceId,
      });

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('CRM zerado com sucesso!', {
        description: 'Seu workspace foi restaurado para o estado inicial.',
      });
      // Invalidate all queries to refresh the app state
      queryClient.invalidateQueries();
      // Navigate to dashboard to see the fresh state
      navigate('/dashboard');
    },
    onError: (error) => {
      toast.error('Falha ao zerar o CRM', {
        description: error.message,
      });
    },
  });

  return {
    resetWorkspace: resetWorkspaceMutation.mutateAsync,
    isResetting: resetWorkspaceMutation.isPending,
    currentWorkspace,
  };
}
