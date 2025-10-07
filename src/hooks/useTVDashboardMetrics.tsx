import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';
import { useMemo } from 'react';
import { startOfDay, startOfMonth, subDays } from 'date-fns';

export function useTVDashboardMetrics() {
  const { currentWorkspace } = useWorkspace();

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['tv-dashboard-leads', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('workspace_id', currentWorkspace.id);

      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: 30000,
  });

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['tv-dashboard-conversations', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_read', false);

      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: 10000,
  });

  const metrics = useMemo(() => {
    const today = startOfDay(new Date());
    const yesterday = startOfDay(subDays(new Date(), 1));
    const thisMonth = startOfMonth(new Date());

    const leadsToday = leads.filter(l => new Date(l.created_at) >= today).length;
    const leadsYesterday = leads.filter(
      l => new Date(l.created_at) >= yesterday && new Date(l.created_at) < today
    ).length;
    const leadsChange = leadsYesterday > 0 
      ? Math.round(((leadsToday - leadsYesterday) / leadsYesterday) * 100)
      : 0;

    const monthlyLeads = leads.filter(l => new Date(l.created_at) >= thisMonth);
    const monthlyRevenue = monthlyLeads
      .filter(l => l.status === 'closed_won')
      .reduce((sum, l) => sum + Number(l.value || 0), 0);
    
    const revenueGoal = 100000;

    const totalConverted = leads.filter(l => l.status === 'closed_won').length;
    const conversionRate = leads.length > 0 
      ? Math.round((totalConverted / leads.length) * 100)
      : 0;
    
    const conversionChange = 0;

    const activeConversations = conversations.length;

    const pipelineValue = leads
      .filter(l => l.status !== 'closed_won' && l.status !== 'closed_lost')
      .reduce((sum, l) => sum + Number(l.value || 0), 0);

    return {
      leadsToday,
      leadsChange,
      monthlyRevenue,
      revenueGoal,
      conversionRate,
      conversionChange,
      activeConversations,
      pipelineValue,
    };
  }, [leads, conversations]);

  return {
    metrics,
    isLoading: leadsLoading || conversationsLoading,
  };
}
