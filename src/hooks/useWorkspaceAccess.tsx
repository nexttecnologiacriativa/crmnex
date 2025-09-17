
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';
import { useAuth } from './useAuth';

export function useWorkspaceAccess() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  const { data: isWorkspaceActive = true, isLoading } = useQuery({
    queryKey: ['workspace-access', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return true;
      
      console.log('Checking workspace access for:', currentWorkspace.id);
      
      const { data, error } = await supabase
        .from('account_status')
        .select('is_active, suspension_reason, suspended_at')
        .eq('workspace_id', currentWorkspace.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking workspace access:', error);
        return true; // Default para ativo em caso de erro
      }
      
      console.log('Workspace status:', data);
      
      return data ? data.is_active : true; // Se não existe registro, assume ativo
    },
    enabled: !!currentWorkspace,
  });

  return {
    isWorkspaceActive,
    isLoading,
    currentWorkspace,
    user,
  };
}
