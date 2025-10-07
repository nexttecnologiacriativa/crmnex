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
            {/* Métricas principais em grid responsivo */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total de Agendamentos</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold text-nexcrm-blue">{metrics.total}</p>
                  {metrics.change !== 0 && (
                    <div className={`flex items-center gap-1 text-sm font-semibold ${metrics.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {metrics.change > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      <span>{Math.abs(metrics.change)}%</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Taxa de Comparecimento</p>
                <p className="text-4xl font-bold text-green-600">{metrics.taxa_comparecimento}%</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Aguardando</p>
                <p className="text-4xl font-bold text-gray-600">{metrics.byStatus.aguardando}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Compareceram</p>
                <p className="text-4xl font-bold text-green-600">{metrics.byStatus.compareceu}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Faltaram</p>
                <p className="text-4xl font-bold text-red-600">{metrics.byStatus.falhou}</p>
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
            {metrics.total > 0 ? (
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
