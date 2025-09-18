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
      const { data, error } = await supabase.functions.invoke('whatsapp-evolution', {
        body: {
          action: 'test_webhook',
          instanceName,
          workspaceId,
          apiUrl,
          apiKey
        }
      });

      if (error) throw error;

      setWebhookStatus(data);

      if (data.success) {
        toast({
          title: "Status do Webhook",
          description: data.active ? "Webhook está ativo e configurado" : "Webhook não está configurado",
        });
      } else {
        toast({
          title: "Erro ao Verificar Webhook",
          description: data.error,
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

            {webhookStatus.configured_url && (
              <div>
                <p className="text-sm font-medium">URL Configurada:</p>
                <p className="text-xs text-muted-foreground break-all">
                  {webhookStatus.configured_url}
                </p>
              </div>
            )}

            {webhookStatus.events && webhookStatus.events.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Eventos Configurados:</p>
                <div className="flex flex-wrap gap-1">
                  {webhookStatus.events.map((event: string, index: number) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {event}
                    </Badge>
                  ))}
                </div>
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