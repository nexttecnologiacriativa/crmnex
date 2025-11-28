import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, RefreshCw, Settings, AlertCircle } from 'lucide-react';

interface WebhookManagerProps {
  instanceName: string;
  workspaceId: string;
  apiUrl?: string;
  apiKey?: string;
}

export default function WebhookManager({ instanceName, workspaceId, apiUrl, apiKey }: WebhookManagerProps) {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [reconfiguring, setReconfiguring] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<any>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const { toast } = useToast();

  const configureWebhook = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-evolution', {
        body: {
          action: 'configure_webhook',
          instanceName,
          workspaceId,
          apiUrl,
          apiKey
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Webhook Configurado",
          description: data.message,
        });
        // Atualizar status após configuração
        await testWebhook();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao Configurar Webhook",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testWebhook = async () => {
    setTesting(true);
    try {
      // Primeiro verificar o status atual do webhook
      const statusResponse = await supabase.functions.invoke('whatsapp-evolution', {
        body: {
          action: 'get_webhook_status',
          instanceName,
          workspaceId,
          apiUrl,
          apiKey
        }
      });

      if (statusResponse.error) throw statusResponse.error;

      setWebhookStatus(statusResponse.data);

      if (statusResponse.data.success) {
        toast({
          title: "Status do Webhook",
          description: statusResponse.data.configured 
            ? `Webhook ${statusResponse.data.active ? 'ativo' : 'inativo'} - URL: ${statusResponse.data.correct_url ? 'Correta' : 'Incorreta'}`
            : "Webhook não configurado",
        });
      } else {
        toast({
          title: "Erro ao Verificar Webhook",
          description: statusResponse.data.error,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao Verificar Webhook",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleDiagnoseAll = async () => {
    setDiagnosing(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-evolution', {
        body: {
          action: 'diagnose_all_instances',
          workspaceId,
          apiUrl,
          apiKey
        }
      });

      if (error) throw error;

      if (data.success) {
        setDiagnostics(data);
        toast({
          title: "Diagnóstico Completo",
          description: `${data.total_instances} instância(s) analisada(s). ${data.problem_instances} com problemas.`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao Diagnosticar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDiagnosing(false);
    }
  };

  const handleFixWebhook = async (instanceToFix?: string) => {
    const targetInstance = instanceToFix || instanceName;
    setFixing(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-evolution', {
        body: {
          action: 'fix_webhook',
          instanceName: targetInstance,
          workspaceId,
          apiUrl,
          apiKey
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Webhook Corrigido",
          description: data.message,
        });
        
        // Rediagnosticar após correção
        setTimeout(() => {
          handleDiagnoseAll();
        }, 1000);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao Corrigir Webhook",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setFixing(false);
    }
  };

  const handleReconfigureAllInstances = async () => {
    setReconfiguring(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-evolution', {
        body: {
          action: 'reconfigure_all_instances',
          workspaceId,
          apiUrl,
          apiKey
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Instâncias Reconfiguradas",
          description: `${data.reconfigured_count} instâncias foram reconfiguradas com sucesso.`,
        });
        
        setTimeout(() => {
          handleDiagnoseAll();
        }, 2000);
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      toast({
        title: "Erro ao Reconfigurar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setReconfiguring(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuração de Webhook
        </CardTitle>
        <CardDescription>
          Gerencie o webhook para receber mensagens dos usuários
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleDiagnoseAll}
            disabled={diagnosing}
            variant="default"
          >
            {diagnosing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <AlertCircle className="mr-2 h-4 w-4" />
            Diagnosticar Todas as Instâncias
          </Button>
          
          <Button
            onClick={configureWebhook}
            disabled={loading}
            variant="outline"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Configurar Webhook
          </Button>
          
          <Button
            onClick={testWebhook}
            disabled={testing}
            variant="outline"
          >
            {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <RefreshCw className="mr-2 h-4 w-4" />
            Verificar Status
          </Button>
        </div>

        {diagnostics && (
          <div className="space-y-3 mt-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <h3 className="font-medium">Resultado do Diagnóstico</h3>
                <p className="text-sm text-muted-foreground">
                  {diagnostics.total_instances} instância(s) | {diagnostics.problem_instances} com problema(s)
                </p>
              </div>
              {diagnostics.problem_instances > 0 && (
                <Badge variant="destructive">{diagnostics.problem_instances} problemas</Badge>
              )}
            </div>

            {diagnostics.diagnostics?.map((diag: any, idx: number) => (
              <div key={idx} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {diag.needsFix ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    <div>
                      <p className="font-medium">{diag.instanceName}</p>
                      <p className="text-xs text-muted-foreground">{diag.phone_number}</p>
                    </div>
                  </div>
                  {diag.needsFix && (
                    <Button
                      onClick={() => handleFixWebhook(diag.instanceName)}
                      disabled={fixing}
                      size="sm"
                      variant="destructive"
                    >
                      {fixing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Corrigir Automaticamente
                    </Button>
                  )}
                </div>

                {diag.issues && diag.issues.length > 0 && (
                  <div className="space-y-1 pl-7">
                    <p className="text-sm font-medium text-red-600">Problemas:</p>
                    {diag.issues.map((issue: string, i: number) => (
                      <p key={i} className="text-xs text-red-600">• {issue}</p>
                    ))}
                  </div>
                )}

                {diag.current_config && (
                  <div className="pl-7 text-xs space-y-1">
                    <p className="font-medium">Configuração Atual:</p>
                    <p>URL: {diag.current_config.url?.substring(0, 50)}...</p>
                    <p>Eventos: {diag.current_config.events?.join(', ') || 'Nenhum'}</p>
                    <p>Base64: {diag.current_config.webhook_base64 ? '✅' : '❌'}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {webhookStatus && (
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              {webhookStatus.active ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">
                Status: {webhookStatus.active ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            {webhookStatus?.configured && (
              <div className="space-y-2 text-sm">
                <p><strong>URL:</strong> {webhookStatus.url}</p>
                <p><strong>URL Correta:</strong> {webhookStatus.correct_url ? '✅ Sim' : '❌ Não'}</p>
                <p><strong>Ativo:</strong> {webhookStatus.active ? '✅ Sim' : '❌ Não'}</p>
                <p><strong>Base64:</strong> {webhookStatus.webhook_base64 ? '✅ Ativado' : '❌ Desativado'}</p>
                <p><strong>Eventos:</strong> {webhookStatus.events?.join(', ')}</p>
              </div>
            )}
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <p><strong>Webhook URL:</strong></p>
          <p className="break-all font-mono text-xs">
            https://mqotdnvwyjhyiqzbefpm.supabase.co/functions/v1/whatsapp-webhook
          </p>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-yellow-800 mb-2">
                Reconfigurar Todas as Instâncias
              </h3>
              <p className="text-sm text-yellow-700 mb-3">
                Se você não está recebendo mensagens, clique aqui para reconfigurar todas as instâncias 
                com o webhook correto e prefixo do workspace.
              </p>
              <Button
                onClick={handleReconfigureAllInstances}
                disabled={reconfiguring}
                variant="outline"
                className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
              >
                {reconfiguring ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Reconfigurando...
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4 mr-2" />
                    Reconfigurar Todas as Instâncias
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}