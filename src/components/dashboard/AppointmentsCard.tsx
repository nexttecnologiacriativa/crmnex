import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { useAppointmentMetrics, PeriodFilter as PeriodFilterType } from '@/hooks/useAppointmentMetrics';
import PeriodFilter from './PeriodFilter';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

const statusConfig = {
  aguardando: { label: 'Aguardando', color: '#6b7280', icon: '⏳' },
  compareceu: { label: 'Compareceu', color: '#10b981', icon: '✅' },
  nao_qualificado: { label: 'Não Qualificado', color: '#f59e0b', icon: '⚠️' },
  reagendado: { label: 'Reagendado', color: '#3b82f6', icon: '🔄' },
  falhou: { label: 'Faltou', color: '#ef4444', icon: '❌' },
};

export default function AppointmentsCard() {
  const [period, setPeriod] = useState<PeriodFilterType>('day');
  const { metrics, isLoading } = useAppointmentMetrics(period);

  const chartData = Object.entries(metrics.byStatus).map(([status, count]) => ({
    name: statusConfig[status as keyof typeof statusConfig].label,
    value: count,
    fill: statusConfig[status as keyof typeof statusConfig].color,
  }));

  return (
    <Card className="border-0 shadow-lg mb-6 md:mb-8">
      <CardHeader className="bg-gradient-to-r from-nexcrm-blue/10 to-nexcrm-green/10 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-nexcrm-blue">
            <Calendar className="h-6 w-6" />
            Agendamentos
          </CardTitle>
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nexcrm-blue"></div>
          </div>
        ) : (
          <div className="space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Criados Hoje */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-sm font-semibold text-muted-foreground mb-2">Criados Hoje</p>
            <p className="text-3xl font-bold text-primary">{metrics.createdToday}</p>
            <div className="flex gap-2 mt-2">
              <span className="text-xs font-medium text-green-600">✅ {metrics.createdTodayByStatus.compareceu}</span>
              <span className="text-xs font-medium text-red-600">❌ {metrics.createdTodayByStatus.falhou}</span>
            </div>
          </div>

          {/* Criados na Semana */}
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
            <p className="text-sm font-semibold text-muted-foreground mb-2">Criados na Semana</p>
            <p className="text-3xl font-bold text-blue-600">{metrics.createdThisWeek}</p>
          </div>

          {/* Criados no Mês */}
          <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
            <p className="text-sm font-semibold text-muted-foreground mb-2">Criados no Mês</p>
            <p className="text-3xl font-bold text-purple-600">{metrics.createdThisMonth}</p>
          </div>

          {/* Taxa de Comparecimento */}
          <div className="p-4 rounded-lg bg-green-50 border border-green-100">
            <p className="text-sm font-semibold text-green-800 mb-2">Taxa de Comparecimento</p>
            <p className="text-3xl font-bold text-green-600">{metrics.taxa_comparecimento}%</p>
            <p className="text-xs text-green-700 mt-1 font-medium">Compareceram vs Finalizados</p>
          </div>

          {/* Aguardando */}
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
            <p className="text-sm font-semibold text-muted-foreground mb-2">Aguardando</p>
            <p className="text-3xl font-bold text-gray-600">{metrics.byStatus.aguardando}</p>
          </div>
        </div>

            {/* Status badges em linha */}
            <div className="flex flex-wrap gap-3">
              {Object.entries(metrics.byStatus).map(([status, count]) => {
                const config = statusConfig[status as keyof typeof statusConfig];
                return (
                  <Badge
                    key={status}
                    variant="outline"
                    className="px-4 py-2 text-base font-semibold"
                    style={{ 
                      borderColor: config.color, 
                      color: config.color,
                      backgroundColor: `${config.color}10`
                    }}
                  >
                    <span className="mr-2 text-lg">{config.icon}</span>
                    {config.label}: <span className="ml-1 font-bold">{count}</span>
                  </Badge>
                );
              })}
            </div>

            {/* Gráfico em tela inteira */}
            {metrics.createdToday > 0 || Object.values(metrics.byStatus).some(v => v > 0) ? (
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 13, fontWeight: 500 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 13 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px'
                      }}
                    />
                    <Bar 
                      dataKey="value" 
                      radius={[8, 8, 0, 0]}
                      maxBarSize={80}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-16 bg-gray-50 rounded-lg">
                <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-lg text-muted-foreground font-medium">
                  Nenhum agendamento encontrado neste período
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
