import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';
import { useMemo } from 'react';
import { startOfDay, startOfMonth, subDays, endOfDay } from 'date-fns';
import { useTVDashboardSettings } from './useTVDashboardSettings';

export function useTVDashboardMetrics() {
  const { currentWorkspace } = useWorkspace();
  const { settings } = useTVDashboardSettings();

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

  const { data: appointments = [] } = useQuery({
    queryKey: ['tv-dashboard-appointments', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from('lead_appointments')
        .select('*')
        .eq('workspace_id', currentWorkspace.id);

      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: 30000,
  });

  const metrics = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const todayEnd = endOfDay(now);
    const yesterday = startOfDay(subDays(now, 1));
    const thisMonth = startOfMonth(now);

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
    
    const revenueGoal = settings?.revenue_goal || 100000;

    const totalConverted = leads.filter(l => l.status === 'closed_won').length;
    const conversionRate = leads.length > 0 
      ? Math.round((totalConverted / leads.length) * 100)
      : 0;
    
    const conversionChange = 0;

    const totalLeads = leads.length;

    const pipelineValue = leads
      .filter(l => l.status !== 'closed_won' && l.status !== 'closed_lost')
      .reduce((sum, l) => sum + Number(l.value || 0), 0);

    // Métricas de agendamentos do dia
    const todayAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.scheduled_date);
      return aptDate >= today && aptDate <= todayEnd;
    });

    const appointmentsToday = todayAppointments.length;
    const appointmentsCompareceu = todayAppointments.filter(a => a.status === 'compareceu').length;
    const appointmentsFinalizados = todayAppointments.filter(a => 
      a.status === 'compareceu' || a.status === 'nao_qualificado' || a.status === 'falhou'
    ).length;
    const appointmentsTaxaComparecimento = appointmentsFinalizados > 0
      ? Math.round((appointmentsCompareceu / appointmentsFinalizados) * 100)
      : 0;

    return {
      leadsToday,
      leadsChange,
      monthlyRevenue,
      revenueGoal,
      conversionRate,
      conversionChange,
      totalLeads,
      pipelineValue,
      appointmentsToday,
      appointmentsTaxaComparecimento,
    };
  }, [leads, appointments, settings]);

  return {
    metrics,
    isLoading: leadsLoading,
  };
}
