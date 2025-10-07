import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useMemo } from 'react';
import { motion } from 'framer-motion';

export default function TVPerformanceChart() {
  const { currentWorkspace } = useWorkspace();

  const { data: leads = [] } = useQuery({
    queryKey: ['tv-utm-performance', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from('leads')
        .select('utm_source, value, status')
        .eq('workspace_id', currentWorkspace.id);

      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: 30000,
  });

  const utmData = useMemo(() => {
    const utmMap = new Map();
    
    leads.forEach(lead => {
      const source = lead.utm_source || 'Direto';
      if (!utmMap.has(source)) {
        utmMap.set(source, {
          source,
          count: 0,
          value: 0,
          conversions: 0,
        });
      }
      const data = utmMap.get(source);
      data.count++;
      data.value += Number(lead.value || 0);
      if (lead.status === 'closed_won') {
        data.conversions++;
      }
    });

    return Array.from(utmMap.values())
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  const maxCount = Math.max(...utmData.map(d => d.count), 1);

  return (
    <Card className="h-full glass-morphism border-white/20 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-white">
          📊 Performance por Origem (UTM)
          <motion.span
            className="inline-block w-2 h-2 bg-blue-500 rounded-full"
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
      <CardContent className="p-4">
        <ScrollArea className="h-[calc(100%-60px)] pr-2">
          <div className="space-y-4">
          {utmData.map((item, index) => {
            const width = (item.count / maxCount) * 100;
            const conversionRate = item.count > 0 ? (item.conversions / item.count) * 100 : 0;

            return (
              <motion.div 
                key={item.source} 
                className="space-y-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <motion.div
                      className="w-2 h-6 rounded-full bg-gradient-to-b from-cyan-400 to-blue-500"
                      animate={{ 
                        scaleY: [1, 1.2, 1],
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        delay: index * 0.2
                      }}
                    />
                    <span className="font-semibold text-base text-white">{item.source}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <motion.div 
                      className="text-center"
                      key={`leads-${item.count}`}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="text-xl font-bold text-cyan-300">{item.count}</div>
                      <div className="text-xs text-white/60">Leads</div>
                    </motion.div>
                    <div className="text-center">
                      <div className="text-base font-semibold text-green-400">
                        {conversionRate.toFixed(1)}%
                      </div>
                      <div className="text-xs text-white/60">Conv.</div>
                    </div>
                    <motion.div 
                      className="text-center"
                      key={`value-${item.value}`}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="text-base font-bold text-white">
                        R$ {item.value.toLocaleString('pt-BR')}
                      </div>
                      <div className="text-xs text-white/60">Valor</div>
                    </motion.div>
                  </div>
                </div>
                <div className="relative h-5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-full shadow-lg"
                    initial={{ width: 0 }}
                    animate={{ width: `${width}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    style={{
                      boxShadow: '0 0 20px rgba(34, 211, 238, 0.5)'
                    }}
                  />
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <span className="text-xs font-bold text-white drop-shadow-lg">
                      {width.toFixed(0)}%
                    </span>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>
      </CardContent>
    </Card>
  );
}
