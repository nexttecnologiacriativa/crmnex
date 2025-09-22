import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, RefreshCw, Settings } from 'lucide-react';

interface WebhookManagerProps {
  instanceName: string;
  workspaceId: string;
  apiUrl?: string;
  apiKey?: string;
}

export default function WebhookManager({ instanceName, workspaceId, apiUrl, apiKey }: WebhookManagerProps) {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<any>(null);
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
        <div className="flex gap-2">
          <Button
            onClick={configureWebhook}
            disabled={loading}
            variant="default"
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

          <Button
            onClick={async () => {
              const testData = {
                event: 'MESSAGES_UPSERT',
                instance: instanceName,
                data: [{
                  key: { fromMe: false, remoteJid: '5512974012534@s.whatsapp.net', id: 'test123' },
                  message: { conversation: 'Teste de webhook direto!' },
                  messageType: 'text',
                  pushName: 'Teste'
                }]
              };
              
              try {
                const response = await fetch('https://mqotdnvwyjhyiqzbefpm.supabase.co/functions/v1/whatsapp-webhook', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(testData)
                });
                const result = await response.text();
                toast({
                  title: "Teste Direto",
                  description: `Status: ${response.status} - ${result}`,
                });
              } catch (error: any) {
                toast({
                  title: "Erro no Teste Direto",
                  description: error.message,
                  variant: "destructive",
                });
              }
            }}
            variant="secondary"
            size="sm"
          >
            Testar Webhook Direto
          </Button>
        </div>

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
      </CardContent>
    </Card>
  );
}