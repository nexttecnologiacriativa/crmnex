
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useInviteAcceptance() {
  const { user } = useAuth();

  useEffect(() => {
    const handleInviteAcceptance = async () => {
      if (!user) return;

      try {
        // Verificar se há dados de convite nos metadados do usuário
        const userData = user.user_metadata;
        
        if (userData?.workspace_id && userData?.role) {
          // Verificar se o usuário já é membro do workspace
          const { data: existingMember } = await supabase
            .from('workspace_members')
            .select('id')
            .eq('workspace_id', userData.workspace_id)
            .eq('user_id', user.id)
            .single();

          if (!existingMember) {
            // Adicionar o usuário ao workspace
            const { error } = await supabase
              .from('workspace_members')
              .insert({
                workspace_id: userData.workspace_id,
                user_id: user.id,
                role: userData.role
              });

            if (error) {
              console.error('Erro ao aceitar convite:', error);
              toast.error('Erro ao aceitar convite para o workspace');
            } else {
              toast.success(`Bem-vindo ao workspace ${userData.invited_by_workspace || ''}!`);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao processar convite:', error);
      }
    };

    handleInviteAcceptance();
  }, [user]);
}
