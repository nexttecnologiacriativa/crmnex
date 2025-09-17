
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useWorkspace } from './useWorkspace';
import { getLeadDisplayName } from '@/lib/leadUtils';
import { toast } from '@/hooks/use-toast';

export function useLeadNotifications() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();

  useEffect(() => {
    if (!user || !currentWorkspace?.id) {
      return;
    }

    console.log('Setting up lead notifications for workspace:', currentWorkspace.id);

    const channel = supabase
      .channel(`leads_${currentWorkspace.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `workspace_id=eq.${currentWorkspace.id}`,
        },
        (payload) => {
          const newLead = payload.new;
          
          console.log('New lead notification received:', newLead);
          
          // Mostrar notificação toast
          toast({
            title: "Nova oportunidade no pipeline 💸",
            description: `Lead: ${getLeadDisplayName(newLead)}`,
            duration: 5000,
          });
        }
      )
      .subscribe((status) => {
        console.log('Lead notifications subscription status:', status);
      });

    return () => {
      console.log('Cleaning up lead notifications');
      supabase.removeChannel(channel);
    };
  }, [user, currentWorkspace?.id]);
}
