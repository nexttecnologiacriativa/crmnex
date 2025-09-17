
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';
import { toast } from 'sonner';

export function useClearAllConversations() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  
  return useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) {
        throw new Error('Workspace não encontrado');
      }

      const { data, error } = await supabase.functions.invoke('whatsapp-clear-conversations', {
        body: { workspace_id: currentWorkspace.id }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      toast.success('Todas as conversas foram apagadas!');
    },
    onError: (error: any) => {
      console.error('Clear conversations error:', error);
      toast.error('Erro ao apagar conversas: ' + error.message);
    },
  });
}
