import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';
import { useMemo } from 'react';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths, subYears } from 'date-fns';

export type PeriodFilter = 'day' | 'month' | 'year';

export interface AppointmentMetrics {
  total: number;
  byStatus: {
    aguardando: number;
    compareceu: number;
    nao_qualificado: number;
    reagendado: number;
    falhou: number;
  };
  taxa_comparecimento: number;
  change: number;
  upcomingToday: Array<{
    id: string;
    title: string;
    scheduled_time: string;
    lead_name: string;
    status: string;
  }>;
}

export function useAppointmentMetrics(period: PeriodFilter = 'day') {
  const { currentWorkspace } = useWorkspace();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments-metrics', currentWorkspace?.id, period],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      
      const { data, error } = await supabase
        .from('lead_appointments')
        .select(`
          *,
          leads (
            name,
            email
          )
        `)
        .eq('workspace_id', currentWorkspace.id)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: 30000, // 30 segundos
  });

  const metrics = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;

    // Definir períodos baseado no filtro
    switch (period) {
      case 'day':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        previousStartDate = startOfDay(subDays(now, 1));
        previousEndDate = endOfDay(subDays(now, 1));
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        previousStartDate = startOfMonth(subMonths(now, 1));
        previousEndDate = endOfMonth(subMonths(now, 1));
        break;
      case 'year':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        previousStartDate = startOfYear(subYears(now, 1));
        previousEndDate = endOfYear(subYears(now, 1));
        break;
    }

    // Filtrar agendamentos do período atual
    const currentPeriodAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.scheduled_date);
      return aptDate >= startDate && aptDate <= endDate;
    });

    // Filtrar agendamentos do período anterior
    const previousPeriodAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.scheduled_date);
      return aptDate >= previousStartDate && aptDate <= previousEndDate;
    });

    // Contar por status
    const byStatus = {
      aguardando: currentPeriodAppointments.filter(a => a.status === 'aguardando').length,
      compareceu: currentPeriodAppointments.filter(a => a.status === 'compareceu').length,
      nao_qualificado: currentPeriodAppointments.filter(a => a.status === 'nao_qualificado').length,
      reagendado: currentPeriodAppointments.filter(a => a.status === 'reagendado').length,
      falhou: currentPeriodAppointments.filter(a => a.status === 'falhou').length,
    };

    // Calcular taxa de comparecimento
    const finalizados = byStatus.compareceu + byStatus.nao_qualificado + byStatus.falhou;
    const taxa_comparecimento = finalizados > 0 
      ? Math.round((byStatus.compareceu / finalizados) * 100)
      : 0;

    // Calcular mudança vs período anterior
    const currentTotal = currentPeriodAppointments.length;
    const previousTotal = previousPeriodAppointments.length;
    const change = previousTotal > 0
      ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100)
      : 0;

    // Próximos agendamentos de hoje
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const upcomingToday = appointments
      .filter(apt => {
        const aptDate = new Date(apt.scheduled_date);
        const aptTime = apt.scheduled_time ? new Date(`2000-01-01T${apt.scheduled_time}`) : new Date();
        const now = new Date();
        return aptDate >= todayStart && 
               aptDate <= todayEnd && 
               apt.status === 'aguardando' &&
               aptTime >= now;
      })
      .slice(0, 5)
      .map(apt => ({
        id: apt.id,
        title: apt.title,
        scheduled_time: apt.scheduled_time,
        lead_name: apt.leads?.name || 'Lead sem nome',
        status: apt.status,
      }));

    return {
      total: currentTotal,
      byStatus,
      taxa_comparecimento,
      change,
      upcomingToday,
    };
  }, [appointments, period]);

  return {
    metrics,
    isLoading,
  };
}
