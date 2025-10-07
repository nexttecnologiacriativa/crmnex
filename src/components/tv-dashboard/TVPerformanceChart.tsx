import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function TVPerformanceChart() {
  const isDarkMode = true; // Você pode passar isso como prop
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
    <Card className={cn(
      "h-full glass-morphism border-2 border-white/20 overflow-hidden",
      isDarkMode 
        ? "bg-gradient-to-br from-[hsl(209,100%,22%)]/80 to-[hsl(209,80%,15%)]/80"
        : "bg-white/90 backdrop-blur-sm"
    )}>
      <CardHeader className="pb-3">
        <CardTitle className={cn(
          "flex items-center gap-2",
          isDarkMode ? "text-white" : "text-[hsl(209,100%,22%)]"
        )}>
          📊 Performance por Origem (UTM)
          <motion.span
            className="inline-block w-2 h-2 bg-[hsl(87,57%,51%)] rounded-full"
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
                      className="w-2 h-6 rounded-full bg-gradient-to-b from-[hsl(87,57%,51%)] to-[hsl(87,57%,40%)]"
                      animate={{ 
                        scaleY: [1, 1.2, 1],
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        delay: index * 0.2
                      }}
                    />
                    <span className={cn(
                      "font-semibold text-base",
                      isDarkMode ? "text-white" : "text-[hsl(209,100%,22%)]"
                    )}>{item.source}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <motion.div 
                      className="text-center"
                      key={`leads-${item.count}`}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className={cn(
                        "text-xl font-bold",
                        isDarkMode ? "text-[hsl(87,57%,51%)]" : "text-[hsl(87,57%,40%)]"
                      )}>{item.count}</div>
                      <div className={cn(
                        "text-xs",
                        isDarkMode ? "text-white/60" : "text-[hsl(209,100%,22%)]/60"
                      )}>Leads</div>
                    </motion.div>
                    <div className="text-center">
                      <div className={cn(
                        "text-base font-semibold",
                        isDarkMode ? "text-[hsl(87,57%,51%)]" : "text-[hsl(87,57%,40%)]"
                      )}>
                        {conversionRate.toFixed(1)}%
                      </div>
                      <div className={cn(
                        "text-xs",
                        isDarkMode ? "text-white/60" : "text-[hsl(209,100%,22%)]/60"
                      )}>Conv.</div>
                    </div>
                    <motion.div 
                      className="text-center"
                      key={`value-${item.value}`}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className={cn(
                        "text-base font-bold",
                        isDarkMode ? "text-white" : "text-[hsl(209,100%,22%)]"
                      )}>
                        R$ {item.value.toLocaleString('pt-BR')}
                      </div>
                      <div className={cn(
                        "text-xs",
                        isDarkMode ? "text-white/60" : "text-[hsl(209,100%,22%)]/60"
                      )}>Valor</div>
                    </motion.div>
                  </div>
                </div>
                <div className="relative h-5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full shadow-lg"
                    initial={{ width: 0 }}
                    animate={{ width: `${width}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    style={{
                      background: 'linear-gradient(90deg, hsl(209, 100%, 22%) 0%, hsl(87, 57%, 51%) 100%)',
                      boxShadow: '0 0 20px rgba(135, 186, 73, 0.5)'
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
