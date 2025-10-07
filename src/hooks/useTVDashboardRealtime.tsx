import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from './useWorkspace';
import { toast } from 'sonner';

export function useTVDashboardRealtime() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const channel = supabase
      .channel('tv-dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `workspace_id=eq.${currentWorkspace.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['tv-dashboard-leads'] });
          queryClient.invalidateQueries({ queryKey: ['tv-funnel-leads'] });
          queryClient.invalidateQueries({ queryKey: ['tv-utm-performance'] });
          queryClient.invalidateQueries({ queryKey: ['tv-leaderboard'] });
          toast.success('✅ Novo lead capturado!', {
            description: `Lead adicionado ao sistema`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
          filter: `workspace_id=eq.${currentWorkspace.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['tv-dashboard-leads'] });
          queryClient.invalidateQueries({ queryKey: ['tv-funnel-leads'] });
          queryClient.invalidateQueries({ queryKey: ['tv-leaderboard'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lead_activities',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tv-activities'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations',
          filter: `workspace_id=eq.${currentWorkspace.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tv-dashboard-conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentWorkspace?.id, queryClient]);
}
