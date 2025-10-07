import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [leads]);

  const maxCount = Math.max(...utmData.map(d => d.count), 1);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
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
      <CardContent>
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
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.source}</span>
                  <div className="flex items-center gap-4">
                    <motion.span 
                      className="text-muted-foreground"
                      key={`utm-count-${item.count}`}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      {item.count} leads
                    </motion.span>
                    <motion.span 
                      className="font-bold text-primary"
                      key={`utm-rate-${conversionRate}`}
                      initial={{ scale: 1.2, color: 'hsl(var(--primary))' }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      {conversionRate.toFixed(0)}%
                    </motion.span>
                  </div>
                </div>
                <div className="relative h-10 bg-muted rounded-lg overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/70 rounded-lg flex items-center justify-between px-4"
                    initial={{ width: 0 }}
                    animate={{ width: `${width}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  >
                    <motion.span 
                      className="text-white font-bold"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      {item.count}
                    </motion.span>
                    <motion.span 
                      className="text-white text-sm"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      R$ {item.value.toLocaleString('pt-BR')}
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
