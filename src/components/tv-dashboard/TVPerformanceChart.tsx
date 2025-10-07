import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useMemo } from 'react';

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
        <CardTitle>📊 Performance por Origem (UTM)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {utmData.map((item) => {
            const width = (item.count / maxCount) * 100;
            const conversionRate = item.count > 0 ? (item.conversions / item.count) * 100 : 0;

            return (
              <div key={item.source} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.source}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">
                      {item.count} leads
                    </span>
                    <span className="font-bold text-primary">
                      {conversionRate.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="relative h-10 bg-muted rounded-lg overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/70 rounded-lg transition-all duration-1000 flex items-center justify-between px-4"
                    style={{ width: `${width}%` }}
                  >
                    <span className="text-white font-bold">
                      {item.count}
                    </span>
                    <span className="text-white text-sm">
                      R$ {item.value.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
