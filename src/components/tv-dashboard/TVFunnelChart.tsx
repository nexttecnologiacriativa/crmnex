import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { startOfDay } from 'date-fns';

interface TVFunnelChartProps {
  isDarkMode?: boolean;
}

export default function TVFunnelChart({ isDarkMode }: TVFunnelChartProps) {
  const { currentWorkspace } = useWorkspace();

  const { data: leads = [] } = useQuery({
    queryKey: ['tv-funnel-leads-today', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const today = startOfDay(new Date());
      
      const { data, error } = await supabase
        .from('leads')
        .select('*, pipeline_stages(name, color, position)')
        .eq('workspace_id', currentWorkspace.id)
        .gte('created_at', today.toISOString());

      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: 30000,
  });

  const stages = useMemo(() => {
    const stageMap = new Map<string, { 
      name: string; 
      count: number; 
      value: number; 
      color: string;
      position: number;
    }>();

    leads.forEach((lead: any) => {
      const stageName = lead.pipeline_stages?.name || 'Sem etapa';
      const stageColor = lead.pipeline_stages?.color || '#6b7280';
      const stagePosition = lead.pipeline_stages?.position ?? 999;
      
      if (!stageMap.has(stageName)) {
        stageMap.set(stageName, { 
          name: stageName, 
          count: 0, 
          value: 0, 
          color: stageColor,
          position: stagePosition
        });
      }
      
      const stage = stageMap.get(stageName)!;
      stage.count += 1;
      stage.value += Math.max(Number(lead.value) || 0, 0);
    });

    return Array.from(stageMap.values())
      .sort((a, b) => a.position - b.position);
  }, [leads]);

  const maxCount = Math.max(...stages.map(s => s.count), 1);
  const totalLeads = leads.length;
  const totalValue = stages.reduce((sum, s) => sum + s.value, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className={cn(
      "h-full border-0 shadow-xl rounded-2xl overflow-hidden relative transition-all duration-300 hover:shadow-2xl",
      isDarkMode ? "bg-gray-800/90" : "bg-white"
    )}>
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-green-500/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl" />

      <CardHeader className={cn(
        "pb-1 pt-2 px-3 border-b relative",
        isDarkMode 
          ? "bg-gradient-to-r from-green-500/20 via-green-500/10 to-transparent border-gray-700/50"
          : "bg-gradient-to-r from-green-500/10 via-green-500/5 to-transparent border-gray-100"
      )}>
        <CardTitle className={cn(
          "text-sm sm:text-base flex items-center gap-2",
          isDarkMode ? "text-white" : "text-gray-800"
        )}>
          <div className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center",
            isDarkMode ? "bg-green-500/20" : "bg-green-500/10"
          )}>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          Funil do Dia
          <span className="ml-auto flex items-center gap-1 text-[10px] font-normal text-muted-foreground">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
            </span>
            Tempo real
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 px-3 pb-2 relative">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "p-1.5 sm:p-2 rounded-xl text-center shadow-lg border transition-all hover:scale-[1.02]",
              isDarkMode 
                ? "bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/20" 
                : "bg-gradient-to-br from-blue-500/10 to-blue-50 border-blue-100"
            )}
          >
            <div className={cn(
              "text-[9px] sm:text-[10px] font-medium",
              isDarkMode ? "text-blue-300" : "text-blue-600"
            )}>
              Leads Hoje
            </div>
            <motion.div
              key={totalLeads}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className={cn(
                "text-lg sm:text-xl font-bold",
                isDarkMode ? "text-white" : "text-blue-600"
              )}
            >
              {totalLeads}
            </motion.div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className={cn(
              "p-1.5 sm:p-2 rounded-xl text-center shadow-lg border transition-all hover:scale-[1.02]",
              isDarkMode 
                ? "bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/20" 
                : "bg-gradient-to-br from-green-500/10 to-green-50 border-green-100"
            )}
          >
            <div className={cn(
              "text-[9px] sm:text-[10px] font-medium",
              isDarkMode ? "text-green-300" : "text-green-600"
            )}>
              Valor Total
            </div>
            <motion.div
              key={totalValue}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="text-base sm:text-lg font-bold text-green-500"
            >
              {formatCurrency(totalValue)}
            </motion.div>
          </motion.div>
        </div>

        {/* Funnel Stages - Compact */}
        <div className="space-y-1">
          {stages.length === 0 ? (
            <div className={cn(
              "text-center py-4 text-xs",
              isDarkMode ? "text-gray-400" : "text-muted-foreground"
            )}>
              Nenhum lead hoje
            </div>
          ) : (
            stages.map((stage, index) => {
              const widthPercent = Math.max((stage.count / maxCount) * 100, 15);
              
              return (
                <motion.div
                  key={stage.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${widthPercent}%` }}
                        transition={{ duration: 0.4, delay: index * 0.08 }}
                        className="h-6 sm:h-7 rounded-lg flex items-center justify-between px-2 shadow-md"
                        style={{ 
                          background: `linear-gradient(90deg, ${stage.color}ee, ${stage.color}aa)`,
                        }}
                      >
                        <span className="text-[10px] sm:text-xs font-medium text-white truncate max-w-[60%] drop-shadow-sm">
                          {stage.name}
                        </span>
                        <motion.span
                          key={stage.count}
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          className="text-xs sm:text-sm font-bold text-white drop-shadow-sm"
                        >
                          {stage.count}
                        </motion.span>
                      </motion.div>
                    </div>
                    <div className={cn(
                      "text-[10px] sm:text-xs font-semibold w-14 sm:w-16 text-right",
                      isDarkMode ? "text-gray-300" : "text-gray-600"
                    )}>
                      {formatCurrency(stage.value)}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}