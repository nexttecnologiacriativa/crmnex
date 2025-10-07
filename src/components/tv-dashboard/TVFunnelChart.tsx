import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useMemo } from 'react';
import { motion } from 'framer-motion';

export default function TVFunnelChart() {
  const { currentWorkspace } = useWorkspace();

  const { data: leads = [] } = useQuery({
    queryKey: ['tv-funnel-leads', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from('leads')
        .select('*, pipeline_stages(name, color, position)')
        .eq('workspace_id', currentWorkspace.id);

      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: 30000,
  });

  const stages = useMemo(() => {
    const stageMap = new Map();
    
    leads.forEach(lead => {
      if (lead.pipeline_stages) {
        const stage = lead.pipeline_stages;
        if (!stageMap.has(stage.name)) {
          stageMap.set(stage.name, {
            name: stage.name,
            color: stage.color,
            position: stage.position,
            count: 0,
            value: 0,
          });
        }
        const stageData = stageMap.get(stage.name);
        stageData.count++;
        stageData.value += Number(lead.value || 0);
      }
    });

    return Array.from(stageMap.values()).sort((a, b) => a.position - b.position);
  }, [leads]);

  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <Card className="h-full glass-morphism border-2 border-white/20 overflow-hidden bg-gradient-to-br from-[hsl(209,100%,22%)]/80 to-[hsl(209,80%,15%)]/80">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-white">
          Funil de Vendas - Tempo Real
          <motion.span
            className="inline-block w-2 h-2 bg-green-500 rounded-full"
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [1, 0.5, 1]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stages.map((stage, index) => {
            const width = (stage.count / maxCount) * 100;
            const conversionRate = index > 0 ? (stage.count / stages[0].count) * 100 : 100;

            return (
              <motion.div 
                key={stage.name} 
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-white">{stage.name}</span>
                  <div className="flex items-center gap-3">
                    <motion.span 
                      className="text-white/70 text-xs"
                      key={`count-${stage.count}`}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      {stage.count} leads
                    </motion.span>
                    <motion.span 
                      className="font-bold text-white text-sm"
                      key={`value-${stage.value}`}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      R$ {stage.value.toLocaleString('pt-BR')}
                    </motion.span>
                    {index > 0 && (
                      <span className="text-xs text-[hsl(87,57%,51%)] font-semibold">
                        {conversionRate.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="relative h-10 bg-white/10 rounded-lg overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-lg flex items-center justify-center shadow-lg"
                    initial={{ width: 0 }}
                    animate={{ width: `${width}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    style={{
                      backgroundColor: stage.color,
                      boxShadow: `0 0 20px ${stage.color}40`
                    }}
                  >
                    <motion.span 
                      className="text-white font-bold text-base px-3 drop-shadow-lg"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      {stage.count}
                    </motion.span>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
