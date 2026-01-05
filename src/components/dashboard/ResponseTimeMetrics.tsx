import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, UserX, MessageCircle, AlertTriangle } from 'lucide-react';
import { useLeadResponseMetrics, formatResponseTime } from '@/hooks/useLeadResponseMetrics';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function ResponseTimeMetrics() {
  const { data: metrics, isLoading } = useLeadResponseMetrics();

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-nexcrm-blue/10 to-nexcrm-green/10 p-6">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Tempo de Atendimento
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-nexcrm-blue"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  const idleData = [
    { name: '1-3 dias', value: metrics.leadsByIdleTime['1-3 dias'], color: 'hsl(var(--nexcrm-green))' },
    { name: '4-7 dias', value: metrics.leadsByIdleTime['4-7 dias'], color: 'hsl(45, 93%, 47%)' },
    { name: '7+ dias', value: metrics.leadsByIdleTime['7+ dias'], color: 'hsl(0, 84%, 60%)' }
  ].filter(item => item.value > 0);

  const totalIdle = idleData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-nexcrm-blue/10 to-nexcrm-green/10 p-6">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-nexcrm-blue" />
          Tempo de Atendimento
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tempo Médio de 1º Atendimento */}
          <div className="bg-gradient-to-br from-nexcrm-blue/10 to-nexcrm-blue/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-nexcrm-blue/20 flex items-center justify-center">
                <Clock className="h-4 w-4 text-nexcrm-blue" />
              </div>
              <span className="text-sm text-muted-foreground">1º Atendimento</span>
            </div>
            <p className="text-2xl font-bold text-nexcrm-blue">
              {formatResponseTime(metrics.avgFirstResponseTime)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">tempo médio</p>
          </div>

          {/* Tempo de Resposta WhatsApp */}
          <div className="bg-gradient-to-br from-nexcrm-green/10 to-nexcrm-green/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-nexcrm-green/20 flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-nexcrm-green" />
              </div>
              <span className="text-sm text-muted-foreground">Resposta WhatsApp</span>
            </div>
            <p className="text-2xl font-bold text-nexcrm-green">
              {formatResponseTime(metrics.avgWhatsAppResponseTime)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">tempo médio</p>
          </div>

          {/* Leads Aguardando Resposta */}
          <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <span className="text-sm text-muted-foreground">Aguardando Resposta</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">
              {metrics.leadsWithoutResponse}
            </p>
            <p className="text-xs text-muted-foreground mt-1">leads</p>
          </div>

          {/* Leads Nunca Contatados */}
          <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <UserX className="h-4 w-4 text-red-600" />
              </div>
              <span className="text-sm text-muted-foreground">Sem Contato</span>
            </div>
            <p className="text-2xl font-bold text-red-600">
              {metrics.leadsNeverContacted}
            </p>
            <p className="text-xs text-muted-foreground mt-1">leads</p>
          </div>
        </div>

        {/* Gráfico de Leads Parados */}
        {totalIdle > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-medium mb-4">Leads por Tempo Parado</h4>
            <div className="flex items-center gap-6">
              <div className="w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={idleData}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={50}
                      dataKey="value"
                    >
                      {idleData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value} leads`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {idleData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {item.value} leads
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
