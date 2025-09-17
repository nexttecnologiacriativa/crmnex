import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TrendingDown, Filter, Calendar as CalendarIcon } from 'lucide-react';
import { usePipelines } from '@/hooks/usePipeline';
import { useLeads } from '@/hooks/useLeads';
import { useWorkspace } from '@/hooks/useWorkspace';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

export default function LeadsFunnelChart() {
  const { currentWorkspace } = useWorkspace();
  const { data: pipelines = [] } = usePipelines(currentWorkspace?.id);
  const { data: leads = [] } = useLeads();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(2020, 0, 1), // Start from January 1, 2020
    to: new Date()
  });

  // Auto-select default pipeline if none selected
  const pipeline = useMemo(() => {
    const selected = pipelines.find(p => p.id === selectedPipelineId);
    if (!selected && pipelines.length > 0) {
      // Try to find default pipeline first
      const defaultPipeline = pipelines.find(p => p.is_default);
      const targetPipeline = defaultPipeline || pipelines[0];
      setSelectedPipelineId(targetPipeline.id);
      return targetPipeline;
    }
    return selected;
  }, [pipelines, selectedPipelineId]);

  // Calculate funnel data
  const funnelData = useMemo(() => {
    if (!pipeline?.pipeline_stages) return [];

    // Filter leads by pipeline and date range
    const pipelineLeads = leads.filter(lead => {
      if (lead.pipeline_id !== pipeline.id) return false;
      
      if (dateRange?.from || dateRange?.to) {
        const leadDate = new Date(lead.created_at);
        if (dateRange.from && leadDate < dateRange.from) return false;
        if (dateRange.to && leadDate > dateRange.to) return false;
      }
      
      return true;
    });
    
    // Light gray tone for all stages (matching reference image)
    const lightGray = '#F8FAFC'; // Very light gray for background
    
    return pipeline.pipeline_stages.map((stage, index) => {
      const stageLeads = pipelineLeads.filter(lead => lead.stage_id === stage.id);
      const count = stageLeads.length;
      const totalLeads = pipelineLeads.length;
      const percentage = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
      
      // Calculate width for funnel effect (inversely proportional)
      const maxWidth = 100;
      const minWidth = 20;
      const width = Math.max(minWidth, maxWidth - (index * 15));
      
      return {
        ...stage,
        count,
        percentage,
        width,
        totalValue: stageLeads.reduce((sum, lead) => sum + (lead.value || 0), 0),
        grayColor: lightGray
      };
    });
  }, [pipeline, leads, dateRange]);

  const totalLeads = funnelData.reduce((sum, stage) => sum + stage.count, 0);
  const totalValue = funnelData.reduce((sum, stage) => sum + stage.totalValue, 0);

  return (
    <Card className="border-0 shadow-xl overflow-hidden">
      <CardHeader className="gradient-premium p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Funil de Conversão</CardTitle>
              <p className="text-white/80 text-sm">Visualização do pipeline de vendas</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-white/60" />
            <Select value={selectedPipelineId} onValueChange={setSelectedPipelineId}>
              <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Selecione um pipeline" />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((pipeline) => (
                  <SelectItem key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-64 justify-start text-left font-normal bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd MMM", { locale: ptBR })} -{" "}
                        {format(dateRange.to, "dd MMM yyyy", { locale: ptBR })}
                      </>
                    ) : (
                      format(dateRange.from, "dd MMM yyyy", { locale: ptBR })
                    )
                  ) : (
                    <span>Selecione período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  locale={ptBR}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {funnelData.length > 0 ? (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="text-center p-4 bg-gradient-to-r from-purple-50/50 to-blue-50/50 rounded-xl border border-purple-100">
                <p className="text-2xl font-bold text-premium-purple">{totalLeads}</p>
                <p className="text-sm text-muted-foreground">Total de Leads</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-r from-blue-50/50 to-purple-50/50 rounded-xl border border-blue-100">
                <p className="text-2xl font-bold text-premium-blue">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(totalValue)}
                </p>
                <p className="text-sm text-muted-foreground">Valor Total</p>
              </div>
            </div>

            {/* Funnel Visualization */}
            <div className="relative">
              <div className="space-y-2">
                {funnelData.map((stage, index) => (
                  <div key={stage.id} className="relative flex flex-col items-center">
                    {/* Stage Bar - Light background with dark text and border */}
                    <div 
                      className="relative transition-all duration-300 hover:shadow-md rounded-lg border border-slate-200"
                      style={{ 
                        width: `${stage.width}%`,
                        minWidth: '200px',
                        backgroundColor: '#F8FAFC'
                      }}
                    >
                      <div className="h-16 flex items-center justify-between px-6 text-slate-700 font-medium rounded-lg"
                           style={{ backgroundColor: '#F8FAFC' }}>
                        <div>
                          <p className="font-semibold text-base text-slate-800">{stage.name}</p>
                          <p className="text-sm text-slate-600">{stage.count} leads</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-base text-slate-800">{stage.percentage.toFixed(1)}%</p>
                          <p className="text-sm text-slate-600">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                              notation: 'compact'
                            }).format(stage.totalValue)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Connector */}
                    {index < funnelData.length - 1 && (
                      <div className="w-0.5 h-6 bg-gradient-to-b from-muted via-border to-muted my-1"></div>
                    )}
                  </div>
                ))}
              </div>

              {/* Side decorations */}
              <div className="absolute -left-8 top-1/2 transform -translate-y-1/2 w-16 h-32 bg-gradient-to-r from-premium-purple/20 to-transparent rounded-r-full opacity-30"></div>
              <div className="absolute -right-8 top-1/2 transform -translate-y-1/2 w-16 h-32 bg-gradient-to-l from-premium-blue/20 to-transparent rounded-l-full opacity-30"></div>
            </div>

          </div>
        ) : (
          <div className="text-center py-12">
            <TrendingDown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {pipelines.length === 0 
                ? 'Nenhum pipeline encontrado' 
                : 'Selecione um pipeline para visualizar o funil'
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}