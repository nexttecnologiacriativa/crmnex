import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, CheckCircle2, XCircle, Clock, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MetaWebhookLogsProps {
  integrationId: string;
}

interface WebhookLog {
  id: string;
  event_type: string;
  status: string;
  error_message: string | null;
  lead_id: string | null;
  leadgen_id: string | null;
  form_id: string | null;
  processing_time_ms: number | null;
  created_at: string;
  payload: any;
}

export default function MetaWebhookLogs({ integrationId }: MetaWebhookLogsProps) {
  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['meta-webhook-logs', integrationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_webhook_logs')
        .select('*')
        .eq('integration_id', integrationId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as WebhookLog[];
    },
    refetchInterval: 30000 // Auto-refresh every 30 seconds
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Sucesso</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processando</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Últimos webhooks recebidos
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
        >
          <RefreshCw className="w-3 h-3 mr-2" />
          Atualizar
        </Button>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum webhook recebido ainda</p>
          <p className="text-xs mt-1">
            Quando você receber leads do Meta, eles aparecerão aqui
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {logs.map((log) => (
              <div 
                key={log.id} 
                className="p-3 border rounded-lg text-sm hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(log.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {log.event_type === 'leadgen' ? 'Lead Recebido' : log.event_type}
                        </span>
                        {getStatusBadge(log.status)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                        {log.processing_time_ms && (
                          <span className="ml-2">• {log.processing_time_ms}ms</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {log.lead_id && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      asChild
                    >
                      <a href={`/leads/${log.lead_id}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Ver Lead
                      </a>
                    </Button>
                  )}
                </div>

                {log.error_message && (
                  <div className="mt-2 p-2 bg-red-50 text-red-700 rounded text-xs">
                    {log.error_message}
                  </div>
                )}

                {log.leadgen_id && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Lead ID: {log.leadgen_id}
                    {log.form_id && <span className="ml-2">• Form: {log.form_id}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}