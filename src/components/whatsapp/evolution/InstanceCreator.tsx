import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Plus,
  Loader2,
  Smartphone,
  Settings,
  CheckCircle,
  AlertCircle,
  Shuffle,
  QrCode,
  X
} from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface InstanceCreatorProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function InstanceCreator({ onSuccess, onCancel }: InstanceCreatorProps) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [instanceName, setInstanceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [creationStep, setCreationStep] = useState<'form' | 'creating' | 'success' | 'qr'>('form');
  const [qrCode, setQrCode] = useState<string | null>(null);

  const generateInstanceName = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `instance_${timestamp}_${random}`;
  };

  const generateUniqueName = () => {
    const uniqueName = generateInstanceName();
    setInstanceName(uniqueName);
  };

  const getEvolutionConfig = () => {
    if (!currentWorkspace) return null;
    const configKey = `evolution_config_${currentWorkspace.id}`;
    const stored = localStorage.getItem(configKey);
    if (!stored) return null;
    
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error parsing evolution config:', error);
      return null;
    }
  };

  const createInstance = async () => {
    if (!instanceName.trim()) {
      toast.error('Digite um nome para a instância');
      return;
    }

    if (!currentWorkspace) {
      toast.error('Workspace não encontrado');
      return;
    }

    const config = getEvolutionConfig();
    
    // Usar configuração padrão se não houver configuração personalizada
    const apiKey = config?.global_api_key || 'B6D711FCDE4D4FD5936544120E713976';
    const apiUrl = config?.api_url || 'https://api.glav.com.br';

    setIsCreating(true);
    setCreationStep('creating');

    try {
      // Criar instância via API Evolution
      const response = await supabase.functions.invoke('whatsapp-evolution', {
        body: {
          action: 'create_instance',
          instanceName: instanceName.trim(),
          workspaceId: currentWorkspace.id,
          apiKey: apiKey,
          apiUrl: apiUrl
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao criar instância');
      }

      const { data: responseData } = response;
      
      // Verificar se há QR Code na resposta
      if (responseData?.qr_code) {
        setQrCode(responseData.qr_code);
        setCreationStep('qr');
        toast.success('Instância criada! Escaneie o QR Code para conectar.');
      } else {
        setCreationStep('success');
        toast.success('Instância criada com sucesso!');
        
        // Aguardar um momento antes de chamar onSuccess
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
          onSuccess();
        }, 1500);
      }

    } catch (error) {
      console.error('Error creating instance:', error);
      toast.error(`Erro ao criar instância: ${(error as Error).message}`);
      setCreationStep('form');
    } finally {
      setIsCreating(false);
    }
  };

  if (creationStep === 'creating') {
    return (
      <Card className="border-blue-200">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Criando Instância</h3>
              <p className="text-sm text-blue-700">
                Configurando <strong>{instanceName}</strong> na Evolution API...
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-blue-600">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (creationStep === 'success') {
    return (
      <Card className="border-green-200">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900 mb-2">Instância Criada!</h3>
              <p className="text-sm text-green-700">
                <strong>{instanceName}</strong> foi criada com sucesso.
              </p>
              <p className="text-xs text-green-600 mt-2">
                Redirecionando para o QR Code...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (creationStep === 'qr') {
    return (
      <Card className="border-green-200">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
          <CardTitle className="flex items-center gap-2 text-green-900">
            <QrCode className="h-5 w-5" />
            QR Code - {instanceName}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="bg-white p-4 rounded-lg border-2 border-green-200 inline-block">
              {qrCode ? (
                <img 
                  src={qrCode} 
                  alt="QR Code para conectar WhatsApp" 
                  className="w-64 h-64 mx-auto"
                />
              ) : (
                <div className="w-64 h-64 bg-gray-100 rounded flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              )}
            </div>
            
            <div className="max-w-md mx-auto">
              <h3 className="font-semibold text-green-900 mb-2">Escaneie o QR Code</h3>
              <p className="text-sm text-green-700 mb-4">
                Abra o WhatsApp no seu celular, vá em <strong>Aparelhos conectados</strong> e 
                escaneie este QR Code para conectar a instância.
              </p>
              
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
                    onSuccess();
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Conectado!
                </Button>
                <Button
                  variant="outline"
                  onClick={onCancel}
                >
                  <X className="h-4 w-4 mr-2" />
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-200">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
        <CardTitle className="flex items-center gap-2 text-green-900">
          <Plus className="h-5 w-5" />
          Criar Nova Instância
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Settings className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Configuração Automática</h4>
              <p className="text-sm text-blue-700 mb-3">
                A instância será criada com as seguintes configurações otimizadas:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Badge variant="outline" className="bg-white text-blue-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  QR Code habilitado
                </Badge>
                <Badge variant="outline" className="bg-white text-blue-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  WhatsApp Baileys
                </Badge>
                <Badge variant="outline" className="bg-white text-blue-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Sempre online
                </Badge>
                <Badge variant="outline" className="bg-white text-blue-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Histórico otimizado
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="instance_name" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Nome da Instância *
            </Label>
            <div className="mt-1 space-y-2">
              <div className="flex gap-2">
                <Input
                  id="instance_name"
                  placeholder="Ex: WhatsApp-Principal"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  disabled={isCreating}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateUniqueName}
                  disabled={isCreating}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Shuffle className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Nome único para identificar sua instância. Clique no botão para gerar automaticamente.
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <strong>Importante:</strong> Após criar a instância, você precisará escanear o QR Code 
                para conectar seu WhatsApp. O QR Code será gerado automaticamente.
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex gap-3">
          <Button
            onClick={createInstance}
            disabled={!instanceName.trim() || isCreating}
            className="bg-green-600 hover:bg-green-700 flex-1"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            {isCreating ? 'Criando Instância...' : 'Criar Instância'}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isCreating}
          >
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}