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
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-nexcrm-blue/10 to-nexcrm-green/10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-nexcrm-blue">
            <Calendar className="h-5 w-5" />
            Agendamentos
          </CardTitle>
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nexcrm-blue"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Métricas principais */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-nexcrm-blue">{metrics.total}</p>
                  {metrics.change !== 0 && (
                    <div className={`flex items-center text-sm ${metrics.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {metrics.change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      <span>{Math.abs(metrics.change)}%</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Taxa Comparecimento</p>
                <p className="text-3xl font-bold text-green-600">{metrics.taxa_comparecimento}%</p>
              </div>
              <div className="space-y-1 col-span-2 md:col-span-1">
                <p className="text-sm text-muted-foreground">Aguardando</p>
                <p className="text-3xl font-bold text-gray-600">{metrics.byStatus.aguardando}</p>
              </div>
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(metrics.byStatus).map(([status, count]) => {
                const config = statusConfig[status as keyof typeof statusConfig];
                return (
                  <Badge
                    key={status}
                    variant="outline"
                    className="px-3 py-1"
                    style={{ borderColor: config.color, color: config.color }}
                  >
                    <span className="mr-1">{config.icon}</span>
                    {config.label}: {count}
                  </Badge>
                );
              })}
            </div>

            {/* Gráfico */}
            {metrics.total > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum agendamento encontrado neste período
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
