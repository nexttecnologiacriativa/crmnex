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
  Trash2,
  RotateCcw
} from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useWhatsAppInstances, useSyncWhatsAppInstances } from '@/hooks/useWhatsAppInstance';
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
      console.log('🔄 Starting sync with Evolution API...');
      await syncInstances.mutateAsync();
      
      // Após sincronização, verificar instâncias órfãs
      await recoverOrphanInstances();
    } catch (error) {
      // Error handling is done in the mutation
      console.error('Auto sync error:', error);
    }
  };

  const recoverOrphanInstances = async () => {
    try {
      if (!currentWorkspace) return;

      console.log('🔍 Checking for orphan instances...');
      
      // Generate workspace prefix for security
      const workspacePrefix = `ws_${currentWorkspace.id.substring(0, 8)}_`;
      
      // Buscar instâncias diretamente da Evolution API via edge function
      const { data: apiData, error: apiError } = await supabase.functions.invoke('whatsapp-evolution', {
        body: {
          action: 'list_instances',
          workspaceId: currentWorkspace.id
        }
      });

      if (apiError) throw apiError;

      if (apiData?.instances) {
        const allEvolutionInstances = apiData.instances;
        // SECURITY: Filter only instances belonging to this workspace
        const evolutionInstances = allEvolutionInstances.filter((apiInstance: any) => {
          const instanceName = apiInstance.instance?.instanceName || apiInstance.instanceName;
          return instanceName && instanceName.startsWith(workspacePrefix);
        });
        
        console.log(`📋 Evolution API instances for workspace: ${evolutionInstances.length} of ${allEvolutionInstances.length} total`);
        
        // Buscar instâncias no banco local
        const { data: localInstances } = await supabase
          .from('whatsapp_instances')
          .select('instance_name')
          .eq('workspace_id', currentWorkspace.id);

        const localInstanceNames = (localInstances || []).map(i => i.instance_name);
        
        // Encontrar instâncias que existem na API mas não no banco
        const orphanInstances = evolutionInstances.filter((apiInstance: any) => {
          const instanceName = apiInstance.instance?.instanceName || apiInstance.instanceName;
          return instanceName && !localInstanceNames.includes(instanceName);
        });

        if (orphanInstances.length > 0) {
          console.log(`🔄 Found ${orphanInstances.length} orphan instances, recovering...`);
          
          for (const orphan of orphanInstances) {
            const instanceName = orphan.instance?.instanceName || orphan.instanceName;
            const status = orphan.instance?.state || orphan.state || 'close';
            
            try {
              await supabase
                .from('whatsapp_instances')
                .insert({
                  instance_name: instanceName,
                  instance_key: instanceName,
                  workspace_id: currentWorkspace.id,
                  status: status,
                  webhook_url: `https://mqotdnvwyjhyiqzbefpm.supabase.co/functions/v1/whatsapp-webhook`,
                });
              
              console.log(`✅ Recovered orphan instance: ${instanceName}`);
            } catch (error) {
              console.error(`❌ Failed to recover orphan instance ${instanceName}:`, error);
            }
          }
          
          toast.success(`Recuperadas ${orphanInstances.length} instâncias órfãs!`);
          refetch();
        }
      }
    } catch (error) {
      console.error('Error checking for orphan instances:', error);
    }
  };

  const handleInstanceCreated = () => {
    refetch();
    setShowCreator(false);
  };

  const updateInstanceStatus = async (instanceName: string) => {
    try {
      await handleSyncInstances();
      toast.success('Status sincronizado com a API!');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao sincronizar status: ' + (error as any)?.message);
    }
  };

  const forceSyncWithAPI = async () => {
    try {
      toast.info('Sincronizando com a API Evolution...');
      await syncInstances.mutateAsync();
      
      // Também executar recuperação de instâncias órfãs
      await recoverOrphanInstances();
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

  const handleFixSync = async (instanceName: string) => {
    try {
      if (!currentWorkspace) return;
      
      toast.info('Corrigindo sincronização...');
      
      const { data, error } = await supabase.functions.invoke('fix-whatsapp-sync', {
        body: {
          workspaceId: currentWorkspace.id,
          instanceName: instanceName
        }
      });

      if (error) throw error;

      await refetch();
      toast.success(`Instância ${instanceName} sincronizada com sucesso!`);
    } catch (error) {
      console.error('Error fixing sync:', error);
      toast.error('Erro ao corrigir sincronização: ' + (error as Error).message);
    }
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

  const canCreateInstance = instances.length < maxInstances;

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
                 onClick={forceSyncWithAPI}
                 disabled={isLoading || syncInstances.isPending}
                 className="text-green-600 hover:text-green-700"
               >
                 <RefreshCw className={`h-4 w-4 mr-2 ${(isLoading || syncInstances.isPending) ? 'animate-spin' : ''}`} />
                 Sincronizar
               </Button>
               <Button
                 variant="destructive"
                 onClick={async () => {
                   const confirmed = window.confirm(
                     `⚠️ ATENÇÃO: Esta ação irá DELETAR PERMANENTEMENTE todas as conversas do WhatsApp!\n\n` +
                     `• Total de conversas: ${instances.length > 0 ? 'Múltiplas' : '0'}\n` +
                     `• Todas as mensagens serão perdidas\n` +
                     `• Esta ação NÃO pode ser desfeita\n\n` +
                     `Tem certeza que deseja continuar?`
                   );
                   
                   if (confirmed) {
                     const doubleConfirm = window.prompt(
                       'Para confirmar, digite "LIMPAR TUDO" (em maiúsculas):'
                     );
                     
                     if (doubleConfirm === 'LIMPAR TUDO') {
                       try {
                         toast('Limpando conversas...', { 
                           description: 'Por favor aguarde, isso pode demorar alguns segundos.' 
                         });

                         const { data, error } = await supabase.functions.invoke('whatsapp-clear-conversations', {
                           body: { workspace_id: currentWorkspace?.id }
                         });
                         
                         if (error) throw error;
                         
                         toast('Conversas Limpas com Sucesso', {
                           description: data.message,
                         });
                         
                         // Força reload da página para garantir que tudo foi atualizado
                         window.location.reload();
                       } catch (error: any) {
                         toast('Erro ao Limpar Conversas', {
                           description: error.message,
                         });
                       }
                     } else if (doubleConfirm !== null) {
                       toast('Operação Cancelada', {
                         description: 'Texto de confirmação incorreto.',
                       });
                     }
                   }
                 }}
                 size="sm"
               >
                 <Trash2 className="h-4 w-4 mr-2" />
                 Limpar Conversas
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

          {/* Header de segurança para instâncias antigas */}
          {instances.length === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Sistema Seguro</h3>
              </div>
              <p className="text-sm text-blue-800">
                O sistema agora está protegido contra vazamento de dados entre workspaces. 
                Apenas instâncias com prefixo <code className="bg-blue-100 px-1 rounded">ws_{currentWorkspace?.id.substring(0, 8)}_</code> são exibidas.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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
                          {(!instance.status || instance.status === 'unknown') && (
                            <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                              ⚠️ Não encontrada na API
                            </Badge>
                          )}
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
                        
                        {/* Botão para corrigir sincronização se mostrar como órfã */}
                        {(!instance.status || instance.status === 'unknown') && isAllowedToEdit && (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleFixSync(instance.instance_name)}
                              className="text-green-600 hover:text-green-700 border-green-200 hover:border-green-300"
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Corrigir
                            </Button>
                          </>
                        )}
                        
                        {/* Migration button for instances without workspace prefix */}
                        {currentWorkspace && !instance.instance_name.startsWith(`ws_${currentWorkspace.id.substring(0, 8)}_`) && isAllowedToEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const workspacePrefix = `ws_${currentWorkspace.id.substring(0, 8)}_`;
                              const oldName = instance.instance_name;
                              const newName = `${workspacePrefix}${oldName}`;
                              
                              const confirmed = window.confirm(
                                `Esta instância precisa ser migrada para garantir segurança.\n\nNome atual: ${oldName}\nNovo nome: ${newName}\n\nDeseja prosseguir?`
                              );
                              
                              if (confirmed) {
                                try {
                                  const { error } = await supabase.functions.invoke('migrate-whatsapp-instances', {
                                    body: {
                                      workspaceId: currentWorkspace.id,
                                      instanceName: oldName,
                                      newInstanceName: newName
                                    }
                                  });
                                  
                                  if (error) throw error;
                                  
                                  toast.success(`Instância migrada: ${oldName} → ${newName}`);
                                  refetch();
                                } catch (error) {
                                  console.error('Migration error:', error);
                                  toast.error('Erro na migração: ' + (error as Error).message);
                                }
                              }
                            }}
                            className="text-orange-600 hover:text-orange-700 border-orange-300"
                          >
                            <Zap className="h-4 w-4 mr-1" />
                            Migrar
                          </Button>
                        )}
                        
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