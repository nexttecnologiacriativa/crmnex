import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SchedulerStats {
  last_execution: string | null;
  total_executions: number;
  avg_campaigns_per_execution: number;
  success_rate: number;
  last_24h_executions: number;
}

export const useSchedulerStatus = () => {
  return useQuery({
    queryKey: ['scheduler-status'],
    queryFn: async (): Promise<SchedulerStats> => {
      const { data, error } = await supabase.rpc('get_scheduler_stats' as any);
      
      if (error) {
        console.error('Error fetching scheduler stats:', error);
        throw error;
      }
      
      return data?.[0] || {
        last_execution: null,
        total_executions: 0,
        avg_campaigns_per_execution: 0,
        success_rate: 0,
        last_24h_executions: 0
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useSchedulerLogs = () => {
  return useQuery({
    queryKey: ['scheduler-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduler_logs')
        .select('*')
        .order('execution_time', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('Error fetching scheduler logs:', error);
        throw error;
      }
      
      return data || [];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};