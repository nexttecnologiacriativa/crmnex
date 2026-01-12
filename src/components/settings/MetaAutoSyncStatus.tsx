import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '@/hooks/useWorkspace';
import { RefreshCw, Clock, CheckCircle2, AlertCircle, Loader2, Activity } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SyncStats {
  last_sync_at: string | null;
  total_leads_24h: number;
  successful_leads_24h: number;
  failed_leads_24h: number;
  auto_sync_leads_24h: number;
}

export default function MetaAutoSyncStatus() {
  const { toast } = useToast();
  const { currentWorkspace } = useWorkspace();
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch sync stats
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['meta-sync-stats', currentWorkspace?.id],
    queryFn: async (): Promise<SyncStats> => {
      if (!currentWorkspace?.id) {
        return {
          last_sync_at: null,
          total_leads_24h: 0,
          successful_leads_24h: 0,
          failed_leads_24h: 0,
          auto_sync_leads_24h: 0
        };
      }

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get integrations for this workspace
      const { data: integrations } = await supabase
        .from('meta_integrations')
        .select('id')
        .eq('workspace_id', currentWorkspace.id);

      if (!integrations || integrations.length === 0) {
        return {
          last_sync_at: null,
          total_leads_24h: 0,
          successful_leads_24h: 0,
          failed_leads_24h: 0,
          auto_sync_leads_24h: 0
        };
      }

      const integrationIds = integrations.map(i => i.id);

      // Get logs from last 24h
      const { data: logs } = await supabase
        .from('meta_webhook_logs')
        .select('status, event_type, created_at')
        .in('integration_id', integrationIds)
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false });

      const successLogs = logs?.filter(l => l.status === 'success') || [];
      const failedLogs = logs?.filter(l => l.status === 'error') || [];
      const autoSyncLogs = logs?.filter(l => l.event_type === 'auto_sync' && l.status === 'success') || [];
      
      // Get last successful sync
      const lastSync = successLogs[0]?.created_at || null;

      return {
        last_sync_at: lastSync,
        total_leads_24h: logs?.length || 0,
        successful_leads_24h: successLogs.length,
        failed_leads_24h: failedLogs.length,
        auto_sync_leads_24h: autoSyncLogs.length
      };
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: 60000 // Refetch every minute
  });

  const handleManualSync = async () => {
    setIsSyncing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('meta-leads-auto-sync');

      if (error) {
        console.error('Sync error:', error);
        toast({
          title: "Erro na sincronização",
          description: "Falha ao executar sincronização automática",
          variant: "destructive"
        });
        return;
      }

      console.log('Sync result:', data);

      if (data.success) {
        const { summary } = data;
        
        if (summary.leads_created > 0) {
          toast({
            title: "Sincronização concluída! 🎉",
            description: `${summary.leads_created} lead(s) criado(s), ${summary.leads_skipped} já existia(m)`,
          });
        } else if (summary.leads_found > 0) {
          toast({
            title: "Nenhum lead novo",
            description: `${summary.leads_found} lead(s) encontrado(s), mas todos já existem no CRM`,
          });
        } else {
          toast({
            title: "Sincronização concluída",
            description: "Nenhum lead novo encontrado nas últimas 2 horas",
          });
        }

        // Refresh stats
        refetch();
      } else {
        toast({
          title: "Erro",
          description: data.message || "Falha na sincronização",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Erro",
        description: "Falha ao executar sincronização",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const hasErrors = (stats?.failed_leads_24h || 0) > 0;
  const errorRate = stats?.total_leads_24h 
    ? Math.round((stats.failed_leads_24h / stats.total_leads_24h) * 100) 
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            <CardTitle className="text-base">Status da Sincronização</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sincronizar Agora
              </>
            )}
          </Button>
        </div>
        <CardDescription>
          Sincronização automática a cada hora como backup do webhook
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Last Sync */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Última sincronização</span>
          </div>
          <span className="text-sm font-medium">
            {stats?.last_sync_at ? (
              formatDistanceToNow(new Date(stats.last_sync_at), { 
                addSuffix: true, 
                locale: ptBR 
              })
            ) : (
              <span className="text-muted-foreground">Nunca</span>
            )}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 border rounded-lg text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-2xl font-bold text-green-600">
                {stats?.successful_leads_24h || 0}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">Leads (24h)</span>
          </div>
          
          <div className="p-3 border rounded-lg text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <RefreshCw className="w-4 h-4 text-blue-500" />
              <span className="text-2xl font-bold text-blue-600">
                {stats?.auto_sync_leads_24h || 0}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">Auto-Sync</span>
          </div>
          
          <div className="p-3 border rounded-lg text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <AlertCircle className={`w-4 h-4 ${hasErrors ? 'text-red-500' : 'text-muted-foreground'}`} />
              <span className={`text-2xl font-bold ${hasErrors ? 'text-red-600' : 'text-muted-foreground'}`}>
                {stats?.failed_leads_24h || 0}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">Erros</span>
          </div>
        </div>

        {/* Error Warning */}
        {hasErrors && errorRate > 20 && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">
                Taxa de erro alta ({errorRate}%)
              </p>
              <p className="text-xs text-red-600">
                Verifique se o token de acesso não expirou. Use o botão "Reautenticar" na integração.
              </p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {!hasErrors && stats?.successful_leads_24h && stats.successful_leads_24h > 0 && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <p className="text-sm text-green-800">
              Tudo funcionando! Leads estão sendo recebidos normalmente.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
