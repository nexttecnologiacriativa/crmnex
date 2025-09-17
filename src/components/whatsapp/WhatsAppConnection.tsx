
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  QrCode, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Plus,
  RefreshCw
} from 'lucide-react';
import {
  useWhatsAppInstances,
  useCreateWhatsAppInstance,
  useGetQRCode,
  useGetInstanceStatus
} from '@/hooks/useWhatsAppInstance';

export default function WhatsAppConnection() {
  const [instanceName, setInstanceName] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: instances = [], isLoading } = useWhatsAppInstances();
  const createInstance = useCreateWhatsAppInstance();
  const getQRCode = useGetQRCode();
  const getStatus = useGetInstanceStatus();

  const handleCreateInstance = async () => {
    if (!instanceName.trim()) return;
    
    await createInstance.mutateAsync(instanceName);
    setInstanceName('');
    setShowCreateForm(false);
  };

  const handleGetQRCode = async (instanceName: string) => {
    try {
      const result = await getQRCode.mutateAsync(instanceName);
      setQrCode(result.qrcode);
    } catch (error) {
      console.error('Error getting QR code:', error);
    }
  };

  const handleRefreshStatus = async (instanceName: string) => {
    try {
      await getStatus.mutateAsync(instanceName);
    } catch (error) {
      console.error('Error refreshing status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'connecting':
        return 'bg-yellow-100 text-yellow-800';
      case 'close':
      case 'disconnected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <CheckCircle className="h-4 w-4" />;
      case 'connecting':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'close':
      case 'disconnected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <XCircle className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-green-600" />
                Conexão WhatsApp Nativa
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Conecte diretamente ao WhatsApp para sincronização automática
              </p>
            </div>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Instância
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {showCreateForm && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="instanceName">Nome da Instância</Label>
                  <Input
                    id="instanceName"
                    placeholder="Ex: minha-empresa"
                    value={instanceName}
                    onChange={(e) => setInstanceName(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateInstance}
                    disabled={!instanceName.trim() || createInstance.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {createInstance.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Criar Instância
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {instances.length === 0 ? (
            <div className="text-center py-8">
              <Smartphone className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">Nenhuma instância configurada</p>
              <p className="text-sm text-gray-500">
                Crie uma instância para conectar ao WhatsApp
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {instances.map((instance) => (
                <div key={instance.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{instance.instance_name}</h3>
                      {instance.phone_number && (
                        <p className="text-sm text-gray-600">{instance.phone_number}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(instance.status)}>
                        {getStatusIcon(instance.status)}
                        <span className="ml-1 capitalize">{instance.status}</span>
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRefreshStatus(instance.instance_name)}
                        disabled={getStatus.isPending}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {instance.status !== 'open' && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleGetQRCode(instance.instance_name)}
                        disabled={getQRCode.isPending}
                      >
                        {getQRCode.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <QrCode className="h-4 w-4 mr-2" />
                        )}
                        Gerar QR Code
                      </Button>
                    </div>
                  )}

                  {qrCode && (
                    <div className="mt-4 flex flex-col items-center">
                      <p className="text-sm text-gray-600 mb-2">
                        Escaneie o QR Code com seu WhatsApp:
                      </p>
                      <img 
                        src={`data:image/png;base64,${qrCode}`} 
                        alt="QR Code" 
                        className="max-w-[200px] max-h-[200px] border"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
