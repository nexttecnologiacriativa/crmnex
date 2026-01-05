import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Users, TrendingUp, CheckSquare, Activity, Eye, ExternalLink, PieChart, Calendar, Sparkles } from 'lucide-react';
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
import ResponseTimeMetrics from './ResponseTimeMetrics';

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
      gradient: 'from-nexcrm-blue via-nexcrm-blue to-blue-600',
      iconBg: 'bg-white/20',
    },
    {
      title: 'Leads este mês',
      value: leads.filter(lead => {
        const leadDate = new Date(lead.created_at);
        const now = new Date();
        return leadDate.getMonth() === now.getMonth() && leadDate.getFullYear() === now.getFullYear();
      }).length,
      icon: TrendingUp,
      gradient: 'from-nexcrm-green via-nexcrm-green to-emerald-600',
      iconBg: 'bg-white/20',
    },
    {
      title: 'Tarefas Pendentes',
      value: pendingTasks.length,
      icon: CheckSquare,
      gradient: 'from-amber-500 via-amber-500 to-orange-500',
      iconBg: 'bg-white/20',
    },
    {
      title: 'Total de Tarefas',
      value: tasks.length,
      icon: Activity,
      gradient: 'from-purple-500 via-purple-500 to-indigo-600',
      iconBg: 'bg-white/20',
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
      {/* Stats Cards - Visual Impactante */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, index) => (
          <Card 
            key={index} 
            className="border-0 shadow-xl rounded-2xl overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 group"
          >
            <CardContent className="p-0">
              <div className={`bg-gradient-to-br ${stat.gradient} p-6 text-white relative overflow-hidden`}>
                {/* Decorative patterns */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-white/5 rounded-full" />
                
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/80 mb-1">{stat.title}</p>
                    <p className="text-4xl font-bold tracking-tight">{stat.value}</p>
                    <div className="flex items-center gap-1 mt-2 text-xs text-white/70">
                      <Sparkles className="h-3 w-3" />
                      <span>Atualizado agora</span>
                    </div>
                  </div>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${stat.iconBg} backdrop-blur-sm group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Response Time Metrics - Moved ABOVE AI Insights */}
      <ResponseTimeMetrics />

      {/* AI Insights Section */}
      <AIInsightsCard />

      {/* Leads Funnel Chart */}
      <LeadsFunnelChart />

      {/* Appointments Card */}
      <AppointmentsCard />

      {/* Recent Content */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
        {/* Recent Leads */}
        <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-nexcrm-blue/10 via-nexcrm-blue/5 to-transparent p-4 md:p-6 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-nexcrm-blue/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-nexcrm-blue" />
                </div>
                Últimos Leads
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/leads')}
                className="text-nexcrm-blue hover:text-nexcrm-blue/80 hover:bg-nexcrm-blue/10"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Ver todos</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {recentLeads.length > 0 ? (
              <div className="space-y-3">
                {recentLeads.map((lead, index) => (
                  <div 
                    key={lead.id} 
                    className="border border-border/50 rounded-xl p-4 hover:bg-muted/50 hover:border-nexcrm-blue/30 transition-all duration-200 cursor-pointer group"
                    onClick={() => navigate(`/leads/${lead.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-nexcrm-blue to-nexcrm-green flex items-center justify-center text-white font-semibold text-sm">
                          {getLeadDisplayName(lead).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm group-hover:text-nexcrm-blue transition-colors truncate">{getLeadDisplayName(lead)}</p>
                          <p className="text-xs text-muted-foreground truncate">{lead.company || lead.email || 'Sem empresa'}</p>
                        </div>
                      </div>
                      <div className="text-right ml-2 flex-shrink-0">
                        <Badge variant="secondary" className="text-xs bg-nexcrm-blue/10 text-nexcrm-blue border-0">
                          {lead.utm_source || 'Direto'}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm">Nenhum lead encontrado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-nexcrm-green/10 via-nexcrm-green/5 to-transparent p-4 md:p-6 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-nexcrm-green/10 flex items-center justify-center">
                  <CheckSquare className="h-4 w-4 text-nexcrm-green" />
                </div>
                Últimas Tarefas
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/tasks')}
                className="text-nexcrm-green hover:text-nexcrm-green/80 hover:bg-nexcrm-green/10"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Ver todos</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {recentTasks.length > 0 ? (
              <div className="space-y-3">
                {recentTasks.map((task) => (
                  <div 
                    key={task.id} 
                    className="border border-border/50 rounded-xl p-4 hover:bg-muted/50 hover:border-nexcrm-green/30 transition-all duration-200 cursor-pointer group"
                    onClick={() => handleViewTask(task)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm group-hover:text-nexcrm-green transition-colors truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground truncate mt-1">{task.description}</p>
                        {task.leads && (
                          <p className="text-xs text-nexcrm-blue mt-1 truncate">
                            Lead: {task.leads.name}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex items-center gap-2 ml-3 flex-shrink-0">
                        <div>
                          <Badge 
                            variant={task.priority === 'high' || task.priority === 'urgent' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {priorityLabels[task.priority]}
                          </Badge>
                          {task.due_date && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(task.due_date).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-nexcrm-green opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewTask(task);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CheckSquare className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm">Nenhuma tarefa encontrada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row - Responsive Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
        {/* UTM Sources Chart */}
        <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="p-4 md:p-6 border-b bg-gradient-to-r from-nexcrm-blue/5 to-transparent">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <div className="w-8 h-8 rounded-lg bg-nexcrm-blue/10 flex items-center justify-center">
                <PieChart className="h-4 w-4 text-nexcrm-blue" />
              </div>
              Leads por Origem
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {utmData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[280px]">
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
              <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
                <PieChart className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm">Nenhum dado de UTM disponível</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks Status Chart */}
        <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="p-4 md:p-6 border-b bg-gradient-to-r from-nexcrm-green/5 to-transparent">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <div className="w-8 h-8 rounded-lg bg-nexcrm-green/10 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-nexcrm-green" />
              </div>
              Tarefas por Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <ChartContainer config={chartConfig} className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taskStatusData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
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
                  <Bar dataKey="count" fill="hsl(var(--nexcrm-green))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}