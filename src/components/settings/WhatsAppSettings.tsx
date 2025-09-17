import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Key, 
  Shield, 
  Phone, 
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Save,
  Copy,
  Check
} from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WhatsAppConfig {
  access_token: string;
  phone_number_id: string;
  webhook_verify_token: string;
  app_secret: string;
  business_account_id: string;
}

interface WhatsAppSettingsProps {
  currentUserRole?: 'admin' | 'manager' | 'user';
}

// URL do webhook
const WEBHOOK_URL = 'https://rxpaaskbhbdirlxaavsm.supabase.co/functions/v1/whatsapp-official-webhook';

// Token de verificação NUMÉRICO
const WEBHOOK_VERIFY_TOKEN = '123456789';

export default function WhatsAppSettings({ currentUserRole }: WhatsAppSettingsProps) {
  const { currentWorkspace } = useWorkspace();
  const [config, setConfig] = useState<WhatsAppConfig>({
    access_token: '',
    phone_number_id: '',
    webhook_verify_token: WEBHOOK_VERIFY_TOKEN,
    app_secret: '',
    business_account_id: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected');
  const [urlCopied, setUrlCopied] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);

  const isAllowedToEdit = currentUserRole === 'admin' || currentUserRole === 'manager';

  useEffect(() => {
    loadConfig();
  }, [currentWorkspace]);

  const loadConfig = async () => {
    if (!currentWorkspace) return;

    try {
      const { data, error } = await supabase
        .from('whatsapp_official_configs')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .maybeSingle();

      if (data && !error) {
        setConfig({
          access_token: data.access_token || '',
          phone_number_id: data.phone_number_id || '',
          webhook_verify_token: WEBHOOK_VERIFY_TOKEN,
          app_secret: data.app_secret || '',
          business_account_id: data.business_account_id || ''
        });
        setConnectionStatus(data.is_active ? 'connected' : 'disconnected');
      }
    } catch (error) {
      console.error('Error loading WhatsApp config:', error);
    }
  };

  const copyToClipboard = async (text: string, type: 'url' | 'token') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'url') {
        setUrlCopied(true);
        setTimeout(() => setUrlCopied(false), 2000);
      } else {
        setTokenCopied(true);
        setTimeout(() => setTokenCopied(false), 2000);
      }
      toast.success('Copiado para a área de transferência!');
    } catch (error) {
      toast.error('Erro ao copiar para a área de transferência');
    }
  };

  const handleSave = async () => {
    if (!currentWorkspace || !isAllowedToEdit) return;

    if (!config.access_token.trim()) {
      toast.error('Access Token é obrigatório');
      return;
    }

    if (!config.phone_number_id.trim()) {
      toast.error('Phone Number ID é obrigatório');
      return;
    }

    setIsLoading(true);
    try {
      const { data: existingConfig } = await supabase
        .from('whatsapp_official_configs')
        .select('id')
        .eq('workspace_id', currentWorkspace.id)
        .maybeSingle();

      const configToSave = {
        workspace_id: currentWorkspace.id,
        access_token: config.access_token.trim(),
        phone_number_id: config.phone_number_id.trim(),
        webhook_verify_token: WEBHOOK_VERIFY_TOKEN,
        app_secret: config.app_secret.trim() || null,
        business_account_id: config.business_account_id.trim() || null,
        is_active: false,
        updated_at: new Date().toISOString()
      };

      let result;
      if (existingConfig) {
        result = await supabase
          .from('whatsapp_official_configs')
          .update(configToSave)
          .eq('workspace_id', currentWorkspace.id);
      } else {
        result = await supabase
          .from('whatsapp_official_configs')
          .insert(configToSave);
      }

      if (result.error) {
        throw result.error;
      }

      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Erro ao salvar configurações: ' + (error as any)?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    if (!config.access_token || !config.phone_number_id) {
      toast.error('Preencha o Access Token e Phone Number ID primeiro');
      return;
    }

    if (!isAllowedToEdit) return;

    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-official-test', {
        body: {
          access_token: config.access_token,
          phone_number_id: config.phone_number_id
        }
      });

      if (error) throw error;

      if (data.success) {
        setConnectionStatus('connected');
        toast.success('Conexão com WhatsApp Business API estabelecida!');
        
        if (currentWorkspace) {
          await supabase
            .from('whatsapp_official_configs')
            .update({ is_active: true })
            .eq('workspace_id', currentWorkspace.id);
        }
      } else {
        setConnectionStatus('error');
        toast.error('Erro na conexão: ' + data.error);
      }
    } catch (error) {
      setConnectionStatus('error');
      toast.error('Erro ao testar conexão');
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Conectado';
      case 'error':
        return 'Erro na Conexão';
      default:
        return 'Desconectado';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-600" />
                WhatsApp Business API Oficial
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Configure sua integração com a API oficial do WhatsApp Business
              </p>
            </div>
            <Badge className={getStatusColor()}>
              {getStatusIcon()}
              <span className="ml-1">{getStatusText()}</span>
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {currentUserRole && !isAllowedToEdit && (
              <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md mb-4">
                Você não tem permissão para gerenciar as configurações do WhatsApp.
              </p>
          )}

          <div className="bg-red-50 border-2 border-red-300 p-6 rounded-lg">
            <h3 className="font-bold text-red-900 mb-4 text-lg flex items-center gap-2">
              🚨 CONFIGURAÇÃO CRÍTICA DO WEBHOOK
            </h3>
            <p className="text-red-800 mb-4 font-medium">
              Use EXATAMENTE estes valores no Meta for Developers - NÃO ALTERE NADA:
            </p>
            
            <div className="space-y-4">
              <div className="bg-white p-4 rounded border-2 border-red-200">
                <p className="text-sm font-bold text-red-700 mb-2">
                  🔗 URL de Callback (Cole exatamente):
                </p>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border">
                  <code className="text-sm font-mono flex-1 break-all text-red-900 font-bold">
                    {WEBHOOK_URL}
                  </code>
                  <Button
                    onClick={() => copyToClipboard(WEBHOOK_URL, 'url')}
                    variant="outline"
                    size="sm"
                    className="h-8 text-red-600 border-red-300"
                  >
                    {urlCopied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded border-2 border-red-200">
                <p className="text-sm font-bold text-red-700 mb-2">
                  🔑 Token de Verificação (Cole exatamente):
                </p>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border">
                  <code className="text-2xl font-mono flex-1 text-center text-red-900 font-bold bg-yellow-100 p-2 rounded">
                    {WEBHOOK_VERIFY_TOKEN}
                  </code>
                  <Button
                    onClick={() => copyToClipboard(WEBHOOK_VERIFY_TOKEN, 'token')}
                    variant="outline"
                    size="sm"
                    className="h-8 text-red-600 border-red-300"
                  >
                    {tokenCopied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-400 rounded">
              <p className="text-sm font-bold text-yellow-900 mb-2">
                ⚠️ INSTRUÇÕES IMPORTANTES:
              </p>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                <li>Use os botões COPIAR para evitar erros de digitação</li>
                <li>A URL deve estar EXATAMENTE como mostrada</li>
                <li>O token deve ser EXATAMENTE: <code className="bg-white px-1 font-bold">123456789</code></li>
                <li>Não adicione espaços ou caracteres extras</li>
                <li>Teste a URL no navegador primeiro para confirmar que está funcionando</li>
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border">
            <h3 className="font-semibold text-blue-900 mb-3">📋 Passos DETALHADOS no Meta for Developers:</h3>
            <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
              <li>Acesse <a href="https://developers.facebook.com/" target="_blank" className="underline font-bold">Meta for Developers</a></li>
              <li>Selecione seu app Business</li>
              <li>No menu lateral, clique em "WhatsApp" → "Configuration"</li>
              <li>Na seção "Webhooks", clique no botão "Edit"</li>
              <li>Cole a URL exatamente como copiada acima no campo "Callback URL"</li>
              <li>Cole o token exatamente como copiado acima no campo "Verify Token"</li>
              <li>Marque a opção "messages" nos eventos (Webhook fields)</li>
              <li>Clique em "Verify and Save"</li>
              <li>Se aparecer erro, verifique se não há espaços extras nos campos</li>
            </ol>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-300">
            <h3 className="font-semibold text-green-900 mb-2">🧪 Teste a URL primeiro:</h3>
            <p className="text-sm text-green-700 mb-2">
              Cole esta URL no seu navegador e adicione os parâmetros de teste:
            </p>
            <code className="text-xs bg-white p-2 rounded block break-all text-green-800">
              {WEBHOOK_URL}?hub.mode=subscribe&hub.verify_token=123456789&hub.challenge=test123
            </code>
            <p className="text-xs text-green-600 mt-2">
              Deve retornar: <strong>test123</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="access_token" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Access Token *
                </Label>
                <Input
                  id="access_token"
                  type="password"
                  placeholder="EAAG..."
                  value={config.access_token}
                  onChange={(e) => setConfig(prev => ({ ...prev, access_token: e.target.value }))}
                  disabled={!isAllowedToEdit || isLoading}
                />
                <p className="text-xs text-gray-500">Token de acesso permanente da WhatsApp Business API</p>
              </div>

              <div>
                <Label htmlFor="phone_number_id" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number ID *
                </Label>
                <Input
                  id="phone_number_id"
                  placeholder="123456789012345"
                  value={config.phone_number_id}
                  onChange={(e) => setConfig(prev => ({ ...prev, phone_number_id: e.target.value }))}
                  disabled={!isAllowedToEdit || isLoading}
                />
                <p className="text-xs text-gray-500">ID do número de telefone comercial</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="webhook_verify_token" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Webhook Verify Token (Sistema)
                </Label>
                <Input
                  id="webhook_verify_token"
                  value={WEBHOOK_VERIFY_TOKEN}
                  disabled={true}
                  className="bg-gray-100 font-mono text-lg font-bold text-center"
                />
                <p className="text-xs text-gray-500">Token numérico gerenciado pelo sistema</p>
              </div>

              <div>
                <Label htmlFor="business_account_id">Business Account ID</Label>
                <Input
                  id="business_account_id"
                  placeholder="123456789012345"
                  value={config.business_account_id}
                  onChange={(e) => setConfig(prev => ({ ...prev, business_account_id: e.target.value }))}
                  disabled={!isAllowedToEdit || isLoading}
                />
                <p className="text-xs text-gray-500">ID da conta comercial (opcional)</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={isLoading || !isAllowedToEdit}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Salvando...' : 'Salvar Configurações'}
            </Button>

            <Button
              onClick={testConnection}
              disabled={isTesting || !config.access_token || !config.phone_number_id || !isAllowedToEdit}
              variant="outline"
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              {isTesting ? 'Testando...' : 'Testar Conexão'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Doc Webhooks
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
