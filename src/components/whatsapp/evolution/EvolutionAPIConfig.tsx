import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Key,
  Shield,
  Save,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EvolutionConfig {
  api_url: string;
  global_api_key: string;
}

interface EvolutionAPIConfigProps {
  onSave: () => void;
  onCancel: () => void;
}

export default function EvolutionAPIConfig({ onSave, onCancel }: EvolutionAPIConfigProps) {
  const { currentWorkspace } = useWorkspace();
  const [config, setConfig] = useState<EvolutionConfig>({
    api_url: 'https://api.glav.com.br',
    global_api_key: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    loadConfig();
  }, [currentWorkspace]);

  const loadConfig = async () => {
    if (!currentWorkspace) return;

    const configKey = `evolution_config_${currentWorkspace.id}`;
    const stored = localStorage.getItem(configKey);
    
    if (stored) {
      const parsed = JSON.parse(stored);
      setConfig({
        api_url: parsed.api_url || 'https://api.glav.com.br',
        global_api_key: parsed.global_api_key || ''
      });
      
      // Auto-sincronizar localStorage com o banco se não existir registro
      try {
        const { data: existingConfig } = await supabase
          .from('whatsapp_evolution_configs')
          .select('id')
          .eq('workspace_id', currentWorkspace.id)
          .maybeSingle();

        if (!existingConfig && parsed.global_api_key) {
          console.log('🔄 Auto-syncing localStorage credentials to database...');
          await supabase
            .from('whatsapp_evolution_configs')
            .upsert({
              workspace_id: currentWorkspace.id,
              api_url: parsed.api_url || 'https://api.glav.com.br',
              global_api_key: parsed.global_api_key,
              updated_at: new Date().toISOString()
            }, { onConflict: 'workspace_id' });
          console.log('✅ Credentials auto-synced to database');
        }
      } catch (error) {
        console.warn('⚠️ Could not auto-sync credentials to database:', error);
      }
    }
  };

  const validateAPIKey = async () => {
    if (!config.global_api_key.trim()) {
      setValidationResult({
        isValid: false,
        message: 'API Key é obrigatória'
      });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      // Testar conexão com a API - usar endpoint que existe na Evolution
      const response = await fetch(`${config.api_url}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.global_api_key
        }
      });

      if (response.ok) {
        setValidationResult({
          isValid: true,
          message: 'Conexão com a API estabelecida com sucesso!'
        });
      } else {
        setValidationResult({
          isValid: false,
          message: `Falha na conexão: ${response.status} - ${response.statusText}`
        });
      }
    } catch (error) {
      setValidationResult({
        isValid: false,
        message: 'Erro ao conectar com a API. Verifique a URL e a chave.'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const saveConfig = async () => {
    if (!currentWorkspace) return;

    if (!config.global_api_key.trim()) {
      toast.error('Global API Key é obrigatório');
      return;
    }

    setIsSaving(true);
    try {
      const configKey = `evolution_config_${currentWorkspace.id}`;
      const configToSave = {
        api_url: config.api_url.trim(),
        global_api_key: config.global_api_key.trim(),
        updated_at: new Date().toISOString()
      };

      // Persistir no localStorage (usado pela aba Atendimento)
      localStorage.setItem(configKey, JSON.stringify(configToSave));

      // Sincronizar com o banco para automações (engine usa tabela)
      const { error: upsertError } = await supabase
        .from('whatsapp_evolution_configs')
        .upsert({
          workspace_id: currentWorkspace.id,
          api_url: configToSave.api_url,
          global_api_key: configToSave.global_api_key,
          updated_at: new Date().toISOString()
        }, { onConflict: 'workspace_id' });

      if (upsertError) {
        console.error('Erro ao salvar no banco:', upsertError);
        toast.error('Erro ao salvar configurações no banco. As automações podem não funcionar.');
        return;
      }

      toast.success('Configurações salvas com sucesso!');
      onSave();
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-blue-200">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Key className="h-5 w-5" />
          Configuração da Evolution API
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Atenção:</strong> Essas configurações são sensíveis e afetam toda a integração WhatsApp.
            Certifique-se de usar credenciais válidas.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label htmlFor="api_url" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              URL da API Evolution
            </Label>
            <Input
              id="api_url"
              placeholder="https://api.glav.com.br"
              value={config.api_url}
              onChange={(e) => setConfig(prev => ({ ...prev, api_url: e.target.value }))}
              disabled={isSaving}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              URL base da sua instalação da Evolution API
            </p>
          </div>

          <div>
            <Label htmlFor="global_api_key" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Global API Key *
            </Label>
            <div className="mt-1 space-y-2">
              <Input
                id="global_api_key"
                type="password"
                placeholder="Digite sua chave global da Evolution API"
                value={config.global_api_key}
                onChange={(e) => setConfig(prev => ({ ...prev, global_api_key: e.target.value }))}
                disabled={isSaving}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={validateAPIKey}
                disabled={!config.global_api_key.trim() || isValidating}
                className="text-blue-600 hover:text-blue-700"
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Testar Conexão
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Chave global configurada na Evolution API (AUTHENTICATION_GLOBAL_AUTH_TOKEN)
            </p>
          </div>

          {validationResult && (
            <Alert className={validationResult.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              {validationResult.isValid ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={validationResult.isValid ? 'text-green-800' : 'text-red-800'}>
                {validationResult.message}
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-2">Como obter a Global API Key:</h4>
            <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
              <li>Acesse o painel da Evolution API</li>
              <li>Vá em Configurações → Autenticação</li>
              <li>Localize "AUTHENTICATION_GLOBAL_AUTH_TOKEN"</li>
              <li>Copie o valor e cole aqui</li>
            </ol>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={saveConfig}
            disabled={isSaving || !config.global_api_key.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSaving ? 'Salvando...' : 'Salvar Configuração'}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}