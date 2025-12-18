import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';

export function useLeadsRealtime() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const channel = supabase
      .channel(`leads-realtime-${currentWorkspace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'leads',
          filter: `workspace_id=eq.${currentWorkspace.id}`
        },
        (payload) => {
          console.log('Lead changed (realtime):', payload.eventType);
          // Invalida todas as queries relacionadas a leads
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          queryClient.invalidateQueries({ queryKey: ['pipeline-leads'] });
          queryClient.invalidateQueries({ queryKey: ['leads-count'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentWorkspace?.id, queryClient]);
}
