import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TrendingUp, Users, Target, DollarSign, Calendar as CalendarIcon, BarChart, Banknote } from 'lucide-react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEnsureDefaultWorkspace } from '@/hooks/useWorkspace';
import { usePipelines } from '@/hooks/usePipeline';
import { useState } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
const COLORS = ['#8b5cf6', '#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#ec4899'];
export default function ReportsAnalytics() {
  const {
    workspace
  } = useEnsureDefaultWorkspace();
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedUtm, setSelectedUtm] = useState<string>('');
  const [selectedPipeline, setSelectedPipeline] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [selectedUtmType, setSelectedUtmType] = useState('utm_source');

  // Buscar pipelines
  const {
    data: pipelines = []
  } = usePipelines(workspace?.id);

  // Buscar estágios do pipeline selecionado
  const selectedPipelineData = pipelines.find(p => p.id === selectedPipeline);
  const availableStages = selectedPipelineData?.pipeline_stages || [];

  const { data: utmData = [] } = useQuery({
    queryKey: ['utm-data', workspace?.id, selectedUtmType],
    queryFn: async () => {
      if (!workspace?.id) return [];
      
      const { data, error } = await supabase
        .from('leads')
        .select(`*, value`)
        .eq('workspace_id', workspace.id)
        .not(selectedUtmType, 'is', null);

      if (error) throw error;
      
      const grouped = data.reduce((acc: any, lead) => {
        const utmValue = lead[selectedUtmType] || 'Sem valor';
        if (!acc[utmValue]) {
          acc[utmValue] = { count: 0, revenue: 0 };
        }
        acc[utmValue].count += 1;
        acc[utmValue].revenue += lead.value || 0;
        return acc;
      }, {});

      return Object.entries(grouped).map(([name, data]: [string, any]) => ({ 
        name, 
        value: data.count,
        revenue: data.revenue,
        conversionRate: ((data.revenue / (data.count || 1)) * 100).toFixed(2)
      }));
    },
    enabled: !!workspace?.id,
  });
  const {
    data: analyticsData
  } = useQuery({
    queryKey: ['analytics', workspace?.id, dateFrom, dateTo, selectedMonth, selectedYear, selectedUtm, selectedPipeline, selectedStage],
    queryFn: async () => {
      if (!workspace) return null;

      // Buscar dados dos leads com informações do estágio
      let query = supabase.from('leads').select(`
          *,
          pipeline_stages (
            name,
            color
          )
        `).eq('workspace_id', workspace.id);

      // Aplicar filtros de data
      if (dateFrom) {
        query = query.gte('created_at', dateFrom.toISOString());
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo.toISOString());
      }
      if (selectedMonth && selectedYear) {
        const startDate = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1);
        const endDate = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0);
        query = query.gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString());
      } else if (selectedYear) {
        const startDate = new Date(parseInt(selectedYear), 0, 1);
        const endDate = new Date(parseInt(selectedYear), 11, 31);
        query = query.gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString());
      }
      if (selectedUtm) {
        query = query.eq('utm_source', selectedUtm);
      }
      if (selectedPipeline) {
        query = query.eq('pipeline_id', selectedPipeline);
      }
      if (selectedStage) {
        query = query.eq('stage_id', selectedStage);
      }
      const {
        data: leads
      } = await query;
      const {
        data: tasks
      } = await supabase.from('tasks').select('*').eq('workspace_id', workspace.id);
      if (!leads) return null;
      console.log('Leads encontrados:', leads);
      console.log('Leads com estágios:', leads.map(lead => ({
        id: lead.id,
        status: lead.status,
        stage_name: lead.pipeline_stages?.name,
        value: lead.value
      })));

      // Métricas básicas corrigidas - usando o nome do estágio 'Fechado'
      const totalLeads = leads.length;
      const closedWonLeads = leads.filter(lead => {
        const stageName = lead.pipeline_stages?.name?.toLowerCase();
        console.log(`Lead ${lead.id}: stage = "${lead.pipeline_stages?.name}"`);
        return stageName === 'fechado' || stageName === 'fechado ganho' || stageName === 'ganho';
      });
      console.log('Leads fechados ganhos:', closedWonLeads);
      const totalValue = closedWonLeads.reduce((sum, lead) => sum + (Number(lead.value) || 0), 0);
      const wonLeads = closedWonLeads.length;
      const conversionRate = totalLeads > 0 ? wonLeads / totalLeads * 100 : 0;
      const averageTicket = wonLeads > 0 ? totalValue / wonLeads : 0;

      // Dinheiro na Mesa - valor de todos os leads menos os fechados
      const closedLostLeads = leads.filter(lead => {
        const stageName = lead.pipeline_stages?.name?.toLowerCase();
        return stageName === 'fechado perdido' || stageName === 'perdido';
      });
      const moneyOnTable = leads.filter(lead => !closedWonLeads.includes(lead) && !closedLostLeads.includes(lead)).reduce((sum, lead) => sum + (Number(lead.value) || 0), 0);

      // Leads por status (usando nome do estágio)
      const leadsByStage = leads.reduce((acc: {
        [key: string]: number;
      }, lead) => {
        const stageName = lead.pipeline_stages?.name || 'Sem Estágio';
        acc[stageName] = (acc[stageName] || 0) + 1;
        return acc;
      }, {});

      // If a pipeline is selected, ensure all its stages are present, even with 0 leads.
      if (selectedPipeline) {
        availableStages.forEach(stage => {
          if (!leadsByStage[stage.name]) {
            leadsByStage[stage.name] = 0;
          }
        });
      }
      const statusData = Object.entries(leadsByStage).map(([stage, count]) => ({
        name: stage,
        value: count
      })).sort((a, b) => b.value - a.value);

      // Leads por combinação de UTM
      const leadsBySource = leads.reduce((acc: any, lead) => {
        const source = lead.utm_source || 'Direto';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {});
      const leadsBySourceData = Object.entries(leadsBySource).map(([name, leads]) => ({
        name,
        leads: leads as number
      })).sort((a, b) => b.leads - a.leads);

      // Performance por UTM
      const utmPerformance = leads.reduce((acc: any, lead) => {
        const source = lead.utm_source || 'Direto';
        const stageName = lead.pipeline_stages?.name?.toLowerCase();
        const isClosed = stageName === 'fechado' || stageName === 'fechado ganho' || stageName === 'ganho';
        if (!acc[source]) {
          acc[source] = {
            leads: 0,
            value: 0,
            conversions: 0
          };
        }
        acc[source].leads += 1;
        if (isClosed) {
          acc[source].value += Number(lead.value) || 0;
          acc[source].conversions += 1;
        }
        return acc;
      }, {});
      const utmData = Object.entries(utmPerformance).map(([source, data]: [string, any]) => ({
        source,
        leads: data.leads,
        value: data.value,
        conversions: data.conversions,
        conversionRate: data.leads > 0 ? data.conversions / data.leads * 100 : 0
      }));

      // Leads por mês
      const leadsByMonth = leads.reduce((acc: any, lead) => {
        const date = new Date(lead.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!acc[monthKey]) {
          acc[monthKey] = {
            count: 0,
            label: new Date(date.getFullYear(), date.getMonth()).toLocaleDateString('pt-BR', {
              year: 'numeric',
              month: 'short'
            })
          };
        }
        acc[monthKey].count++;
        return acc;
      }, {});
      const monthlyData = Object.keys(leadsByMonth).sort().map(key => ({
        month: leadsByMonth[key].label,
        leads: leadsByMonth[key].count
      }));

      // Valor por mês (apenas fechados ganhos)
      const valueByMonth = closedWonLeads.reduce((acc: any, lead) => {
        const date = new Date(lead.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!acc[monthKey]) {
          acc[monthKey] = {
            value: 0,
            label: new Date(date.getFullYear(), date.getMonth()).toLocaleDateString('pt-BR', {
              year: 'numeric',
              month: 'short'
            })
          };
        }
        acc[monthKey].value += Number(lead.value) || 0;
        return acc;
      }, {});
      const monthlyValueData = Object.keys(valueByMonth).sort().map(key => ({
        month: valueByMonth[key].label,
        value: valueByMonth[key].value
      }));

      // Obter UTMs únicas para o filtro
      const uniqueUtms = [...new Set(leads.map(lead => lead.utm_source).filter(Boolean))];
      console.log('Dados finais:', {
        totalLeads,
        totalValue,
        wonLeads,
        conversionRate,
        moneyOnTable,
        closedWonLeads: closedWonLeads.length,
        closedLostLeads: closedLostLeads.length
      });
      // Receita por dia (últimos 30 dias)
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();
      
      const dailyRevenue = last30Days.map(date => {
        const dayRevenue = closedWonLeads
          .filter(lead => lead.created_at.startsWith(date))
          .reduce((sum, lead) => sum + (Number(lead.value) || 0), 0);
        return {
          date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          revenue: dayRevenue
        };
      });

      return {
        totalLeads,
        totalValue,
        wonLeads,
        conversionRate,
        averageTicket,
        moneyOnTable,
        statusData,
        utmData,
        monthlyData,
        monthlyValueData,
        dailyRevenue,
        pendingTasks: tasks?.filter(task => task.status === 'pending').length || 0,
        uniqueUtms,
        leadsBySourceData // Changed from leadsByUtmData
      };
    },
    enabled: !!workspace
  });
  if (!analyticsData) {
    return <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-premium-purple"></div>
      </div>;
  }
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  const clearFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setSelectedMonth('');
    setSelectedYear('');
    setSelectedUtm('');
    setSelectedPipeline('');
    setSelectedStage('');
  };
  const currentYear = new Date().getFullYear();
  const years = Array.from({
    length: 5
  }, (_, i) => (currentYear - i).toString());
  const months = [{
    value: '1',
    label: 'Janeiro'
  }, {
    value: '2',
    label: 'Fevereiro'
  }, {
    value: '3',
    label: 'Março'
  }, {
    value: '4',
    label: 'Abril'
  }, {
    value: '5',
    label: 'Maio'
  }, {
    value: '6',
    label: 'Junho'
  }, {
    value: '7',
    label: 'Julho'
  }, {
    value: '8',
    label: 'Agosto'
  }, {
    value: '9',
    label: 'Setembro'
  }, {
    value: '10',
    label: 'Outubro'
  }, {
    value: '11',
    label: 'Novembro'
  }, {
    value: '12',
    label: 'Dezembro'
  }];
  return <div className="space-y-6">
      

      {/* Filtros */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-nexcrm-blue/10 to-nexcrm-green/10">
          <CardTitle className="text-nexcrm-blue">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-4">
            {/* Data de início */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Início</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            {/* Data de fim */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Fim</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "dd/MM/yyyy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            {/* Ano */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Ano</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar ano" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Mês */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Mês</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar mês" />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* UTM Source */}
            <div className="space-y-2">
              <label className="text-sm font-medium">UTM Source</label>
              <Select value={selectedUtm} onValueChange={setSelectedUtm}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar UTM" />
                </SelectTrigger>
                <SelectContent>
                  {analyticsData.uniqueUtms.map((utm: string) => <SelectItem key={utm} value={utm}>
                      {utm}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Pipeline */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Pipeline</label>
              <Select value={selectedPipeline} onValueChange={value => {
              setSelectedPipeline(value);
              setSelectedStage(''); // Limpar estágio quando mudar pipeline
            }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar Pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map(pipeline => <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Etapa */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Etapa</label>
              <Select value={selectedStage} onValueChange={setSelectedStage} disabled={!selectedPipeline}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar Etapa" />
                </SelectTrigger>
                <SelectContent>
                  {availableStages.map(stage => <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Botão limpar filtros */}
            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-xl transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-purple-600 truncate">Total de Leads</p>
                <p className="text-2xl font-bold text-purple-900 truncate">{analyticsData.totalLeads}</p>
              </div>
              <Users className="h-6 w-6 text-purple-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 hover:shadow-xl transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-green-600 truncate">Receita Total</p>
                <p className="text-2xl font-bold text-green-900 truncate">
                  {formatCurrency(analyticsData.totalValue)}
                </p>
              </div>
              <DollarSign className="h-6 w-6 text-green-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-xl transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-blue-600 truncate">Ticket Médio</p>
                <p className="text-2xl font-bold text-blue-900 truncate">
                  {formatCurrency(analyticsData.averageTicket || 0)}
                </p>
              </div>
              <Banknote className="h-6 w-6 text-blue-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-teal-50 to-teal-100 hover:shadow-xl transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-teal-600 truncate">Conversões</p>
                <p className="text-2xl font-bold text-teal-900 truncate">{analyticsData.wonLeads}</p>
              </div>
              <Target className="h-6 w-6 text-teal-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-xl transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-orange-600 truncate">Taxa de Conversão</p>
                <p className="text-2xl font-bold text-orange-900 truncate">
                  {analyticsData.conversionRate.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-6 w-6 text-orange-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-yellow-100 hover:shadow-xl transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-yellow-600 truncate">Dinheiro na Mesa</p>
                <p className="text-2xl font-bold text-yellow-900 truncate">
                  {formatCurrency(analyticsData.moneyOnTable)}
                </p>
              </div>
              <Banknote className="h-6 w-6 text-yellow-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads por Status */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-nexcrm-green/10 to-nexcrm-blue/10">
            <CardTitle className="text-nexcrm-green flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Leads por Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={analyticsData.statusData} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" label={({
                name,
                percent
              }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                  {analyticsData.statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance por Origem */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-nexcrm-green/10 to-nexcrm-blue/10">
            <CardTitle className="text-nexcrm-green flex items-center gap-2 font-normal text-base">
              <TrendingUp className="h-5 w-5" />
              Performance por Origem
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={analyticsData.utmData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source" />
                <YAxis />
                <Tooltip formatter={(value: unknown, name: string) => {
                if (typeof value !== 'number') return null;
                switch (name) {
                  case 'leads':
                    return [value, 'Leads'];
                  case 'conversions':
                    return [value, 'Conversões'];
                  case 'value':
                    return [formatCurrency(value), 'Valor'];
                  case 'conversionRate':
                    return [`${value.toFixed(1)}%`, 'Taxa de Conversão'];
                  default:
                    return null;
                }
              }} />
                <Bar dataKey="leads" fill="#8b5cf6" />
                <Bar dataKey="conversions" fill="#10b981" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Leads por Mês */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
            <CardTitle className="text-green-600 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Leads por Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="leads" stroke="#10b981" strokeWidth={3} dot={{
                fill: '#10b981',
                strokeWidth: 2,
                r: 4
              }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Receita por Mês */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50">
            <CardTitle className="text-orange-600 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Receita por Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.monthlyValueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: unknown, name: string) => {
                if (name === 'value' && typeof value === 'number') {
                  return [formatCurrency(value), "Valor"];
                }
                return null;
              }} />
                <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={3} dot={{
                fill: '#f59e0b',
                strokeWidth: 2,
                r: 4
              }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Receita por Dia */}
        <Card className="col-span-full h-[500px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-nexcrm-blue" />
              Receita Diária (Últimos 30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-full pb-6">
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analyticsData.dailyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    stroke="#666"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#666"
                    tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
                  />
                  <Tooltip 
                    formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Receita']}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: "#8b5cf6", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Análise de UTMs */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-nexcrm-green" />
            Análise de UTMs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <label className="text-sm font-medium mb-2 block">Tipo de UTM:</label>
            <select 
              value={selectedUtmType} 
              onChange={(e) => setSelectedUtmType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="utm_source">UTM Source</option>
              <option value="utm_medium">UTM Medium</option>
              <option value="utm_campaign">UTM Campaign</option>
              <option value="utm_term">UTM Term</option>
              <option value="utm_content">UTM Content</option>
            </select>
          </div>

          <Tabs defaultValue="chart" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chart">Gráfico</TabsTrigger>
              <TabsTrigger value="table">Tabela Detalhada</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="chart" className="space-y-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={utmData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#666" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#666" />
                    <Tooltip 
                      formatter={(value) => [value, 'Leads']}
                      labelFormatter={(label) => `${selectedUtmType.replace('utm_', '').toUpperCase()}: ${label}`}
                    />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="table" className="space-y-4">
              <div className="rounded-md border">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        {selectedUtmType.replace('utm_', '').toUpperCase()}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Leads</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Receita</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">% do Total</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {utmData.map((item: any, index: number) => {
                      const percentage = ((item.value / analyticsData.totalLeads) * 100).toFixed(1);
                      const isHighPerforming = item.value >= analyticsData.totalLeads * 0.1; // 10% ou mais
                      
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{item.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.value}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            R$ {item.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{percentage}%</td>
                          <td className="px-4 py-3">
                            <span 
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                isHighPerforming ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {isHighPerforming ? "Alto Volume" : "Baixo Volume"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Top Conversores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {utmData
                        .sort((a: any, b: any) => b.value - a.value)
                        .slice(0, 3)
                        .map((item: any, index: number) => (
                          <div key={index} className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">{item.name}</span>
                            <span className="text-sm font-medium">{item.value} leads</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Geradores de Receita</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {utmData
                        .filter((item: any) => item.revenue > 0)
                        .sort((a: any, b: any) => b.revenue - a.revenue)
                        .slice(0, 3)
                        .map((item: any, index: number) => (
                          <div key={index} className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">{item.name}</span>
                            <span className="text-sm font-medium">
                              R$ {item.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>;
}