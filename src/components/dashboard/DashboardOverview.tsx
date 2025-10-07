
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Users, TrendingUp, CheckSquare, Activity, Eye, ExternalLink, PieChart, Calendar } from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useLeads, useLeadsCount } from '@/hooks/useLeads';
import { useTasks } from '@/hooks/useTasks';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useUtmValues } from '@/hooks/useUtmValues';
import { useNavigate } from 'react-router-dom';
import { getLeadDisplayName } from '../../lib/leadUtils';
import LeadsFunnelChart from './LeadsFunnelChart';
import AIInsightsCard from './AIInsightsCard';
import AppointmentsCard from './AppointmentsCard';

export default function DashboardOverview() {
  const { currentWorkspace } = useWorkspace();
  const { data: leads = [] } = useLeads();
  const { data: tasks = [] } = useTasks();
  const { utmSources } = useUtmValues();
  const navigate = useNavigate();
  const { data: leadsCount } = useLeadsCount();

  const recentLeads = leads.slice(0, 5);
  const recentTasks = tasks.slice(0, 5);
  const pendingTasks = tasks.filter(task => task.status === 'pending');

  const priorityLabels = {
    low: 'Baixa',
    medium: 'Média', 
    high: 'Alta',
    urgent: 'Urgente',
  };

  const stats = [
    {
      title: 'Total de Leads',
      value: (leadsCount ?? leads.length),
      icon: Users,
      gradient: 'from-nexcrm-blue to-nexcrm-blue/80',
    },
    {
      title: 'Leads este mês',
      value: leads.filter(lead => {
        const leadDate = new Date(lead.created_at);
        const now = new Date();
        return leadDate.getMonth() === now.getMonth() && leadDate.getFullYear() === now.getFullYear();
      }).length,
      icon: TrendingUp,
      gradient: 'from-nexcrm-green to-nexcrm-green/80',
    },
    {
      title: 'Tarefas Pendentes',
      value: pendingTasks.length,
      icon: CheckSquare,
      gradient: 'from-nexcrm-blue/80 to-nexcrm-blue/60',
    },
    {
      title: 'Total de Tarefas',
      value: tasks.length,
      icon: Activity,
      gradient: 'from-nexcrm-green/80 to-nexcrm-green/60',
    },
  ];

  // Dados para o gráfico de pizza por UTM source
  const utmData = utmSources.map(source => ({
    name: source || 'Direto',
    value: leads.filter(lead => (lead.utm_source || 'Direto') === (source || 'Direto')).length,
  })).filter(item => item.value > 0);

  // Cores para o gráfico de pizza
  const COLORS = ['hsl(var(--nexcrm-blue))', 'hsl(var(--nexcrm-green))', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0'];

  // Dados para o gráfico de tarefas por status
  const taskStatusData = [
    {
      status: 'Pendentes',
      count: tasks.filter(task => task.status === 'pending').length,
    },
    {
      status: 'Em Progresso',
      count: tasks.filter(task => task.status === 'in_progress').length,
    },
    {
      status: 'Concluídas',
      count: tasks.filter(task => task.status === 'completed').length,
    },
    {
      status: 'Canceladas',
      count: tasks.filter(task => task.status === 'cancelled').length,
    },
  ];

  const handleViewTask = (task: any) => {
    navigate(`/tasks/${task.id}`);
  };

  const chartConfig = {
    utm_source: {
      label: 'UTM Source',
    },
    task_status: {
      label: 'Status da Tarefa',
    },
  };

  return (
    <div className="p-4 md:p-6 space-y-6 md:space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="border-0 shadow-lg overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-nexcrm-green p-4 md:p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-white/90">{stat.title}</p>
                    <p className="text-2xl md:text-3xl font-bold">{stat.value}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-sm">
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Insights Section */}
      <AIInsightsCard />

      {/* Leads Funnel Chart */}
      <LeadsFunnelChart />

      {/* Performance by Origin */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-nexcrm-blue/10 to-nexcrm-green/10 p-6">
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Performance por Origem (UTM)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {utmData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie 
                    data={utmData} 
                    cx="50%" 
                    cy="50%" 
                    outerRadius="70%"
                    fill="#8884d8" 
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {utmData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent />} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Nenhum dado de UTM disponível
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appointments Card - Full Width */}
      <AppointmentsCard />

      {/* Recent Content */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
        {/* Recent Leads */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-nexcrm-blue/10 to-nexcrm-green/10 p-4 md:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base md:text-lg font-semibold text-nexcrm-blue">
                Últimos 5 Leads
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/leads')}
                className="text-nexcrm-green hover:text-nexcrm-green/80"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Ver todos</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {recentLeads.length > 0 ? (
              <div className="space-y-3 md:space-y-4">
                {recentLeads.map((lead) => (
                  <div key={lead.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm md:text-base truncate">{getLeadDisplayName(lead)}</p>
                        <p className="text-xs md:text-sm text-gray-600 truncate">{lead.company}</p>
                      </div>
                      <div className="text-right ml-2 flex-shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {lead.utm_source || 'Direto'}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8 text-sm md:text-base">Nenhum lead encontrado</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-nexcrm-green/10 to-nexcrm-blue/10 p-4 md:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base md:text-lg font-semibold text-nexcrm-green">
                Últimas 5 Tarefas
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/tasks')}
                className="text-nexcrm-blue hover:text-nexcrm-blue/80"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Ver todos</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {recentTasks.length > 0 ? (
              <div className="space-y-3 md:space-y-4">
                {recentTasks.map((task) => (
                  <div key={task.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm md:text-base truncate">{task.title}</p>
                        <p className="text-xs md:text-sm text-gray-600 truncate">{task.description}</p>
                        {task.leads && (
                          <p className="text-xs text-nexcrm-blue mt-1 truncate">
                            Lead: {task.leads.name}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex items-center gap-2 ml-2 flex-shrink-0">
                        <div>
                          <Badge 
                            variant={task.priority === 'high' || task.priority === 'urgent' ? 'destructive' : 'outline'}
                            className="text-xs"
                          >
                            {priorityLabels[task.priority]}
                          </Badge>
                          {task.due_date && (
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(task.due_date).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-nexcrm-green"
                          onClick={() => handleViewTask(task)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8 text-sm md:text-base">Nenhuma tarefa encontrada</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row - Responsive Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
        {/* UTM Sources Chart */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <PieChart className="h-4 w-4 md:h-5 md:w-5 text-nexcrm-blue" />
              <span className="truncate">Leads por Origem (UTM Source)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {utmData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] sm:h-[300px] lg:h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie 
                      data={utmData} 
                      cx="50%" 
                      cy="50%" 
                      outerRadius="70%"
                      fill="#8884d8" 
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {utmData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent />} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <p className="text-gray-500 text-center py-8 text-sm md:text-base">Nenhum dado de UTM disponível</p>
            )}
          </CardContent>
        </Card>

        {/* Tasks Status Chart */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Calendar className="h-4 w-4 md:h-5 md:w-5 text-nexcrm-green" />
              <span className="truncate">Tarefas por Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <ChartContainer config={chartConfig} className="h-[250px] sm:h-[300px] lg:h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taskStatusData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="status" 
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--nexcrm-green))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
