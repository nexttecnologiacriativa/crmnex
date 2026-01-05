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
      "h-full",
      isDarkMode ? "bg-gray-800/50 border-gray-700" : "bg-white/80"
    )}>
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className={cn(
          "text-base sm:text-lg flex items-center gap-2",
          isDarkMode ? "text-white" : ""
        )}>
          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Funil do Dia
          <span className="ml-auto flex items-center gap-1 text-xs font-normal text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Tempo real
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "p-2 sm:p-3 rounded-lg text-center",
              isDarkMode ? "bg-gray-700/50" : "bg-primary/10"
            )}
          >
            <div className={cn(
              "text-[10px] sm:text-xs mb-0.5",
              isDarkMode ? "text-gray-300" : "text-muted-foreground"
            )}>
              Leads Hoje
            </div>
            <motion.div
              key={totalLeads}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className={cn(
                "text-xl sm:text-2xl lg:text-3xl font-bold",
                isDarkMode ? "text-white" : "text-primary"
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
              "p-2 sm:p-3 rounded-lg text-center",
              isDarkMode ? "bg-gray-700/50" : "bg-green-500/10"
            )}
          >
            <div className={cn(
              "text-[10px] sm:text-xs mb-0.5",
              isDarkMode ? "text-gray-300" : "text-muted-foreground"
            )}>
              Valor Total
            </div>
            <motion.div
              key={totalValue}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className={cn(
                "text-lg sm:text-xl lg:text-2xl font-bold text-green-500"
              )}
            >
              {formatCurrency(totalValue)}
            </motion.div>
          </motion.div>
        </div>

        {/* Funnel Stages */}
        <div className="space-y-1.5 sm:space-y-2">
          {stages.length === 0 ? (
            <div className={cn(
              "text-center py-6 sm:py-8 text-sm",
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
                  transition={{ delay: index * 0.08 }}
                  className="relative"
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex-1 relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${widthPercent}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="h-8 sm:h-10 lg:h-12 rounded-lg flex items-center justify-between px-2 sm:px-3"
                        style={{ 
                          background: `linear-gradient(90deg, ${stage.color}dd, ${stage.color}88)`,
                        }}
                      >
                        <span className={cn(
                          "text-xs sm:text-sm font-medium text-white truncate max-w-[60%]"
                        )}>
                          {stage.name}
                        </span>
                        <motion.span
                          key={stage.count}
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          className="text-sm sm:text-base lg:text-lg font-bold text-white"
                        >
                          {stage.count}
                        </motion.span>
                      </motion.div>
                    </div>
                    <div className={cn(
                      "text-xs sm:text-sm font-medium w-16 sm:w-20 text-right",
                      isDarkMode ? "text-gray-300" : "text-muted-foreground"
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
