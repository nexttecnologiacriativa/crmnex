import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Plus,
  QrCode,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Settings,
  Users,
  Zap,
  Trash2
} from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useWhatsAppInstances, useSyncWhatsAppInstances } from '@/hooks/useWhatsAppInstance';
import EvolutionAPIConfig from './EvolutionAPIConfig';
import QRCodeManager from './QRCodeManager';
import InstanceCreator from './InstanceCreator';
import HistorySyncManager from './HistorySyncManager';
import WebhookManager from './WebhookManager';

interface WhatsAppInstance {
  id: string;
  instance_name: string;
  instance_key: string;
  status: string;
  phone_number?: string;
  created_at: string;
  last_seen?: string;
  qr_code?: string;
}

interface InstanceManagerProps {
  currentUserRole?: 'admin' | 'manager' | 'user';
}

export default function InstanceManager({ currentUserRole }: InstanceManagerProps) {
  const { currentWorkspace } = useWorkspace();
  const { data: instances = [], isLoading, refetch } = useWhatsAppInstances();
  const syncInstances = useSyncWhatsAppInstances();
  const [showConfig, setShowConfig] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);

  const isAllowedToEdit = currentUserRole === 'admin' || currentUserRole === 'manager';
  const maxInstances = 2; // Limite de 2 instâncias por conta

  useEffect(() => {
    if (currentWorkspace) {
      // Sincronizar imediatamente quando carregar
      handleSyncInstances();
      
      // Sincronizar com a API periodicamente
      const interval = setInterval(() => {
        handleSyncInstances();
      }, 30000); // Sincroniza a cada 30 segundos
      
      return () => clearInterval(interval);
    }
  }, [currentWorkspace]);

  const handleSyncInstances = async () => {
    try {
      const config = getEvolutionConfig();
      if (!config?.global_api_key) {
        return;
      }
      
      await syncInstances.mutateAsync();
    } catch (error) {
      // Error handling is done in the mutation
      console.error('Auto sync error:', error);
    }
  };

  const handleInstanceCreated = () => {
    refetch();
    setShowCreator(false);
  };

  const handleConfigSaved = () => {
    setShowConfig(false);
    refetch();
  };

  const updateInstanceStatus = async (instanceName: string) => {
    try {
      const config = getEvolutionConfig();
      if (!config?.global_api_key) {
        toast.error('Configure a API key primeiro');
        return;
      }

      await handleSyncInstances();
      toast.success('Status sincronizado com a API!');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao sincronizar status: ' + (error as any)?.message);
    }
  };

  const forceSyncWithAPI = async () => {
    try {
      const config = getEvolutionConfig();
      if (!config?.global_api_key) {
        toast.error('Configure a API key primeiro');
        return;
      }

      toast.info('Sincronizando com a API Evolution...');
      await syncInstances.mutateAsync();
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('Erro na sincronização: ' + (error as any)?.message);
    }
  };

  const deleteInstance = async (instanceId: string) => {
    if (!currentWorkspace) return;
    
    const confirmed = window.confirm('Tem certeza que deseja excluir esta instância? Esta ação não pode ser desfeita.');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('whatsapp_instances')
        .delete()
        .eq('id', instanceId)
        .eq('workspace_id', currentWorkspace.id);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      toast.success('Instância excluída com sucesso!');
      refetch();
    } catch (error) {
      console.error('Error deleting instance:', error);
      toast.error('Erro ao excluir instância: ' + (error as any)?.message);
    }
  };

  const getEvolutionConfig = () => {
    if (!currentWorkspace) return null;
    const configKey = `evolution_config_${currentWorkspace.id}`;
    const stored = localStorage.getItem(configKey);
    return stored ? JSON.parse(stored) : null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'connecting':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'close':
      case 'disconnected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <CheckCircle className="h-4 w-4" />;
      case 'connecting':
        return <Clock className="h-4 w-4" />;
      case 'close':
      case 'disconnected':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const config = getEvolutionConfig();
  const canCreateInstance = instances.length < maxInstances && config?.global_api_key;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2">Carregando instâncias...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                WhatsApp Evolution API
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Gerencie até {maxInstances} instâncias do WhatsApp
              </p>
            </div>
          {isAllowedToEdit && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowConfig(!showConfig)}
                className="text-blue-600 hover:text-blue-700"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurar API
              </Button>
              <Button
                variant="outline"
                onClick={forceSyncWithAPI}
                disabled={isLoading || syncInstances.isPending}
                className="text-green-600 hover:text-green-700"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${(isLoading || syncInstances.isPending) ? 'animate-spin' : ''}`} />
                Sincronizar
              </Button>
              <Button
                onClick={() => setShowCreator(!showCreator)}
                disabled={!canCreateInstance}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Instância
              </Button>
            </div>
          )}
          </div>
        </CardHeader>

        <CardContent>
          {/* Limite de instâncias */}
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-full">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">Limite de Instâncias</h3>
                <p className="text-sm text-blue-700">
                  {instances.length} de {maxInstances} instâncias ativas
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: maxInstances }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i < instances.length ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {!config?.global_api_key && isAllowedToEdit && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <h3 className="font-semibold text-yellow-900">Configuração Necessária</h3>
              </div>
              <p className="text-sm text-yellow-800 mb-3">
                Configure a Global API Key para gerenciar instâncias do WhatsApp.
              </p>
              <Button
                variant="outline"
                onClick={() => setShowConfig(true)}
                className="text-yellow-700 border-yellow-300"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurar Agora
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuração da API */}
      {showConfig && (
        <EvolutionAPIConfig
          onSave={handleConfigSaved}
          onCancel={() => setShowConfig(false)}
        />
      )}

      {/* Criador de Instância */}
      {showCreator && canCreateInstance && (
        <InstanceCreator
          onSuccess={handleInstanceCreated}
          onCancel={() => setShowCreator(false)}
        />
      )}

      {/* QR Code Manager */}
      {showQRCode && selectedInstance && (
        <QRCodeManager
          instance={selectedInstance}
          onClose={() => {
            setShowQRCode(false);
            setSelectedInstance(null);
          }}
          onStatusUpdate={refetch}
        />
      )}

      {/* Lista de Instâncias */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Instâncias Ativas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {instances.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Nenhuma instância criada</h3>
              <p className="text-gray-600 mb-4">
                Crie sua primeira instância para começar a usar o WhatsApp
              </p>
              {isAllowedToEdit && canCreateInstance && (
                <Button
                  onClick={() => setShowCreator(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Instância
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {instances.map((instance) => (
                <Card key={instance.id} className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-gray-900">{instance.instance_name}</h4>
                          <Badge variant="outline" className={getStatusColor(instance.status)}>
                            {getStatusIcon(instance.status)}
                            <span className="ml-1 capitalize">{instance.status}</span>
                          </Badge>
                        </div>
                        
                        {instance.phone_number && (
                          <p className="text-sm text-gray-600 flex items-center gap-2">
                            <Smartphone className="h-4 w-4" />
                            {instance.phone_number}
                          </p>
                        )}
                        
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>Criado: {new Date(instance.created_at).toLocaleString('pt-BR')}</span>
                          {instance.last_seen && (
                            <span>Último acesso: {new Date(instance.last_seen).toLocaleString('pt-BR')}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {instance.status !== 'open' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedInstance(instance);
                              setShowQRCode(true);
                            }}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <QrCode className="h-4 w-4 mr-1" />
                            QR Code
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateInstanceStatus(instance.instance_name)}
                          className="text-gray-600 hover:text-gray-700"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        
                        {isAllowedToEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteInstance(instance.id)}
                            className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                         )}
                       </div>
                     </div>

                      {/* Webhook Manager */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <WebhookManager 
                          instanceName={instance.instance_name}
                          workspaceId={currentWorkspace?.id || ''}
                        />
                      </div>

                      {/* History Sync Manager para instâncias conectadas */}
                      {instance.status === 'open' && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <HistorySyncManager 
                            instanceName={instance.instance_name}
                            isConnected={instance.status === 'open'}
                          />
                        </div>
                      )}
                   </CardContent>
                 </Card>
               ))}
             </div>
           )}
         </CardContent>
       </Card>

      {/* Stats footer */}
      {instances.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Conectadas</p>
                  <p className="text-xl font-bold text-green-600">
                    {instances.filter(i => i.status === 'open').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-full">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Conectando</p>
                  <p className="text-xl font-bold text-yellow-600">
                    {instances.filter(i => i.status === 'connecting').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Zap className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-xl font-bold text-blue-600">{instances.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}