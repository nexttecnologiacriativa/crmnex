import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Activity, CheckCircle, AlertTriangle } from "lucide-react";
import { useSchedulerStatus } from "@/hooks/useSchedulerStatus";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SchedulerStatusCard() {
  const { data: stats, isLoading } = useSchedulerStatus();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Status dos Schedulers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Carregando status...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isHealthy = stats && stats.last_24h_executions > 0;
  const successRate = stats?.success_rate || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Status dos Schedulers
          <Badge variant={isHealthy ? "default" : "destructive"}>
            {isHealthy ? "Ativo" : "Inativo"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Geral */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isHealthy ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm font-medium">
              {isHealthy ? "Executando automaticamente" : "Sem execuções recentes"}
            </span>
          </div>
        </div>

        {/* Última Execução */}
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Última execução:{" "}
            {stats?.last_execution
              ? formatDistanceToNow(new Date(stats.last_execution), {
                  addSuffix: true,
                  locale: ptBR,
                })
              : "Nunca"}
          </span>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {stats?.last_24h_executions || 0}
            </div>
            <div className="text-xs text-muted-foreground">Execuções (24h)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {successRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Taxa de Sucesso</div>
          </div>
        </div>

        {/* Informação Adicional */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <p className="font-medium mb-1">🚀 Sistema Automático Ativo:</p>
          <p>• Campanhas são processadas automaticamente</p>
          <p>• Automações funcionam 24/7</p>
          <p>• Não precisa manter o navegador aberto</p>
        </div>
      </CardContent>
    </Card>
  );
}