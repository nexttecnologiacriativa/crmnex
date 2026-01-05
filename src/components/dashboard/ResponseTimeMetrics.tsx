import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, UserX, MessageCircle, AlertTriangle, Timer, Zap, Building2 } from 'lucide-react';
import { useLeadResponseMetrics, formatResponseTime } from '@/hooks/useLeadResponseMetrics';
import { useWorkspace } from '@/hooks/useWorkspace';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';

const PERIOD_OPTIONS = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
  { label: '1 ano', value: 365 }
];

const STORAGE_KEY = 'dashboard_whatsapp_days_back';

function getStatusIndicator(type: 'response' | 'whatsapp', value: number | null) {
  if (value === null) return { color: 'bg-muted', pulse: false, label: 'Sem dados' };
  
  if (type === 'response') {
    // Tempo de primeiro atendimento: < 2h bom, < 24h ok, > 24h ruim
    if (value < 120) return { color: 'bg-nexcrm-green', pulse: false, label: 'Excelente' };
    if (value < 1440) return { color: 'bg-amber-500', pulse: false, label: 'Atenção' };
    return { color: 'bg-red-500', pulse: true, label: 'Crítico' };
  } else {
    // Tempo de resposta WhatsApp: < 15min bom, < 60min ok, > 60min ruim
    if (value < 15) return { color: 'bg-nexcrm-green', pulse: false, label: 'Excelente' };
    if (value < 60) return { color: 'bg-amber-500', pulse: false, label: 'Atenção' };
    return { color: 'bg-red-500', pulse: true, label: 'Crítico' };
  }
}

export default function ResponseTimeMetrics() {
  const { currentWorkspace } = useWorkspace();
  const [daysBack, setDaysBack] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 30;
  });
  
  const { data: metrics, isLoading, refetch } = useLeadResponseMetrics(daysBack);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, daysBack.toString());
  }, [daysBack]);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-nexcrm-blue via-nexcrm-blue/80 to-nexcrm-green p-6 text-white">
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold">Tempo de Atendimento</span>
              <p className="text-xs text-white/70 font-normal mt-0.5">Métricas de resposta e engajamento</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-40">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nexcrm-blue"></div>
              <span className="text-sm text-muted-foreground">Calculando métricas...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  const firstResponseStatus = getStatusIndicator('response', metrics.avgFirstResponseTime);
  const whatsAppStatus = getStatusIndicator('whatsapp', metrics.avgWhatsAppResponseTime);

  const idleData = [
    { name: '1-3 dias', value: metrics.leadsByIdleTime['1-3 dias'], color: 'hsl(var(--nexcrm-green))' },
    { name: '4-7 dias', value: metrics.leadsByIdleTime['4-7 dias'], color: 'hsl(45, 93%, 47%)' },
    { name: '7+ dias', value: metrics.leadsByIdleTime['7+ dias'], color: 'hsl(0, 84%, 60%)' }
  ].filter(item => item.value > 0);

  const totalIdle = idleData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-nexcrm-blue via-nexcrm-blue/90 to-nexcrm-green p-6 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-1/3 w-24 h-24 bg-white/5 rounded-full translate-y-1/2" />
        
        <CardTitle className="flex items-center justify-between gap-3 relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Timer className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-bold">Tempo de Atendimento</span>
              <p className="text-sm text-white/70 font-normal mt-0.5 flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" />
                {currentWorkspace?.name || 'Carregando...'}
              </p>
            </div>
          </div>
          {/* Period selector */}
          <div className="flex gap-1 bg-white/10 rounded-lg p-1">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setDaysBack(option.value)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  daysBack === option.value
                    ? "bg-white text-nexcrm-blue"
                    : "text-white/80 hover:bg-white/10"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tempo Médio de 1º Atendimento */}
          <div className="relative bg-gradient-to-br from-nexcrm-blue/10 via-nexcrm-blue/5 to-transparent rounded-2xl p-5 border border-nexcrm-blue/20 hover:border-nexcrm-blue/40 transition-colors group">
            {/* Status indicator */}
            <div className="absolute top-3 right-3">
              <span className={cn(
                "flex h-3 w-3 rounded-full",
                firstResponseStatus.color
              )}>
                {firstResponseStatus.pulse && (
                  <span className={cn(
                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                    firstResponseStatus.color
                  )} />
                )}
              </span>
            </div>
            
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-nexcrm-blue/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="h-5 w-5 text-nexcrm-blue" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">1º Atendimento</span>
            </div>
            <p className="text-3xl font-bold text-nexcrm-blue">
              {formatResponseTime(metrics.avgFirstResponseTime)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">tempo médio de resposta</p>
          </div>

          {/* Tempo de Resposta WhatsApp */}
          <div className="relative bg-gradient-to-br from-nexcrm-green/10 via-nexcrm-green/5 to-transparent rounded-2xl p-5 border border-nexcrm-green/20 hover:border-nexcrm-green/40 transition-colors group">
            {/* Status indicator */}
            <div className="absolute top-3 right-3">
              <span className={cn(
                "flex h-3 w-3 rounded-full",
                metrics.whatsAppErrorMessage ? 'bg-red-500' : whatsAppStatus.color
              )}>
                {(whatsAppStatus.pulse || metrics.whatsAppErrorMessage) && (
                  <span className={cn(
                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                    metrics.whatsAppErrorMessage ? 'bg-red-500' : whatsAppStatus.color
                  )} />
                )}
              </span>
            </div>
            
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-nexcrm-green/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageCircle className="h-5 w-5 text-nexcrm-green" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Resposta WhatsApp</span>
            </div>
            
            {metrics.whatsAppErrorMessage ? (
              <>
                <p className="text-lg font-bold text-red-500">Erro</p>
                <p className="text-xs text-red-400 mt-1 line-clamp-2">
                  {metrics.whatsAppErrorMessage}
                </p>
                <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>
                  Tentar novamente
                </Button>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold text-nexcrm-green">
                  {formatResponseTime(metrics.avgWhatsAppResponseTime)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.whatsAppPairsTotal > 0 
                    ? `baseado em ${metrics.whatsAppPairsTotal} respostas (${daysBack}d)`
                    : `sem pares nos últimos ${daysBack} dias`
                  }
                </p>
              </>
            )}
          </div>

          {/* Leads Aguardando Resposta */}
          <div className="relative bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl p-5 border border-amber-500/20 hover:border-amber-500/40 transition-colors group">
            {metrics.leadsWithoutResponse > 0 && (
              <div className="absolute top-3 right-3">
                <span className="flex h-3 w-3 rounded-full bg-amber-500">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
                </span>
              </div>
            )}
            
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Aguardando</span>
            </div>
            <p className="text-3xl font-bold text-amber-600">
              {metrics.leadsWithoutResponse}
            </p>
            <p className="text-xs text-muted-foreground mt-1">leads sem resposta</p>
          </div>

          {/* Leads Nunca Contatados */}
          <div className="relative bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent rounded-2xl p-5 border border-red-500/20 hover:border-red-500/40 transition-colors group">
            {metrics.leadsNeverContacted > 5 && (
              <div className="absolute top-3 right-3">
                <span className="flex h-3 w-3 rounded-full bg-red-500">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                </span>
              </div>
            )}
            
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <UserX className="h-5 w-5 text-red-600" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Sem Contato</span>
            </div>
            <p className="text-3xl font-bold text-red-600">
              {metrics.leadsNeverContacted}
            </p>
            <p className="text-xs text-muted-foreground mt-1">leads nunca contatados</p>
          </div>
        </div>

        {/* Gráfico de Leads Parados */}
        {totalIdle > 0 && (
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-nexcrm-blue" />
              <h4 className="text-sm font-semibold">Leads por Tempo Parado</h4>
              <Badge variant="secondary" className="ml-auto">{totalIdle} leads inativos</Badge>
            </div>
            <div className="flex items-center gap-8">
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={idleData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={60}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {idleData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value} leads`, '']}
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                        padding: '8px 12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {idleData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full shadow-sm" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs font-semibold",
                        item.name === '7+ dias' && "border-red-200 bg-red-50 text-red-600",
                        item.name === '4-7 dias' && "border-amber-200 bg-amber-50 text-amber-600",
                        item.name === '1-3 dias' && "border-green-200 bg-green-50 text-green-600"
                      )}
                    >
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