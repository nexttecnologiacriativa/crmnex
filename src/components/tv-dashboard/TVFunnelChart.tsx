import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useMemo } from 'react';

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
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Funil de Vendas - Tempo Real</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.map((stage, index) => {
            const width = (stage.count / maxCount) * 100;
            const conversionRate = index > 0 ? (stage.count / stages[0].count) * 100 : 100;

            return (
              <div key={stage.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{stage.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">
                      {stage.count} leads
                    </span>
                    <span className="font-bold text-primary">
                      R$ {stage.value.toLocaleString('pt-BR')}
                    </span>
                    {index > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {conversionRate.toFixed(0)}% conv.
                      </span>
                    )}
                  </div>
                </div>
                <div className="relative h-12 bg-muted rounded-lg overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-lg transition-all duration-1000 flex items-center justify-center"
                    style={{
                      width: `${width}%`,
                      backgroundColor: stage.color,
                    }}
                  >
                    <span className="text-white font-bold text-lg px-4">
                      {stage.count}
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
