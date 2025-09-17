import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  QrCode,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  X,
  Smartphone,
  Loader2
} from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WhatsAppInstance {
  id: string;
  instance_name: string;
  instance_key: string;
  status: string;
  phone_number?: string;
  qr_code?: string;
}

interface QRCodeManagerProps {
  instance: WhatsAppInstance;
  onClose: () => void;
  onStatusUpdate: () => void;
}

export default function QRCodeManager({ instance, onClose, onStatusUpdate }: QRCodeManagerProps) {
  const { currentWorkspace } = useWorkspace();
  const [qrCode, setQrCode] = useState<string | null>(instance.qr_code || null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutos
  const [isMonitoring, setIsMonitoring] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const monitoringRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!qrCode) {
      getQRCode();
    }
    startTimeout();
    startStatusMonitoring();

    return () => {
      if (timeoutRef.current) clearInterval(timeoutRef.current);
      if (monitoringRef.current) clearInterval(monitoringRef.current);
    };
  }, []);

  const getEvolutionConfig = () => {
    if (!currentWorkspace) return null;
    const configKey = `evolution_config_${currentWorkspace.id}`;
    const stored = localStorage.getItem(configKey);
    return stored ? JSON.parse(stored) : null;
  };

  const getQRCode = async () => {
    setIsLoading(true);
    try {
      const config = getEvolutionConfig();
      if (!config?.global_api_key) {
        toast.error('Configure a API key primeiro');
        return;
      }

      const response = await supabase.functions.invoke('whatsapp-evolution', {
        body: {
          action: 'get_qr',
          instanceName: instance.instance_name,
          workspaceId: currentWorkspace.id,
          apiKey: config.global_api_key,
          apiUrl: config.api_url
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao obter QR Code');
      }

      // Verificar se a instância já está conectada
      if (response.data?.connected) {
        toast.success('Instância já está conectada!');
        onStatusUpdate();
        onClose();
        return;
      }

      if (response.data?.qr_code) {
        setQrCode(response.data.qr_code);
        setTimeLeft(300); // Reset timer
        toast.success('QR Code atualizado!');
      } else {
        toast.warning('QR Code não disponível - instância pode já estar conectada');
      }
    } catch (error) {
      console.error('Error getting QR code:', error);
      toast.error(`Erro ao obter QR Code: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const startTimeout = () => {
    if (timeoutRef.current) clearInterval(timeoutRef.current);
    
    timeoutRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          toast.warning('QR Code expirado! Gerando novo código...');
          getQRCode();
          return 300;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startStatusMonitoring = () => {
    setIsMonitoring(true);
    
    monitoringRef.current = setInterval(async () => {
      try {
        const config = getEvolutionConfig();
        if (!config?.global_api_key) return;

        const response = await supabase.functions.invoke('whatsapp-evolution', {
          body: {
            action: 'get_status',
            instanceName: instance.instance_name,
            workspaceId: currentWorkspace.id,
            apiKey: config.global_api_key,
            apiUrl: config.api_url
          }
        });

        if (response.data?.status === 'open') {
          toast.success('WhatsApp conectado com sucesso!');
          onStatusUpdate();
          onClose();
        }
      } catch (error) {
        console.error('Error monitoring status:', error);
      }
    }, 3000); // Check every 3 seconds
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressValue = () => {
    return (timeLeft / 300) * 100;
  };

  return (
    <Card className="border-blue-200">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <QrCode className="h-5 w-5" />
            QR Code - {instance.instance_name}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-blue-700 hover:text-blue-900"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Status da instância */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">Status da Instância</p>
                <p className="text-sm text-blue-700">Monitorando conexão...</p>
              </div>
            </div>
            <Badge 
              variant="outline" 
              className="bg-white text-blue-700 border-blue-300"
            >
              <Clock className="h-3 w-3 mr-1" />
              {instance.status}
            </Badge>
          </div>

          {/* QR Code */}
          <div className="text-center space-y-4">
            <div className="bg-white border-2 border-gray-200 rounded-lg p-4 inline-block">
              {isLoading ? (
                <div className="w-64 h-64 flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
                    <p className="text-sm text-gray-600">Gerando QR Code...</p>
                  </div>
                </div>
              ) : qrCode ? (
                <img
                  src={qrCode}
                  alt="QR Code WhatsApp"
                  className="w-64 h-64 mx-auto"
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center space-y-3">
                    <AlertCircle className="h-8 w-8 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-600">QR Code não disponível</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-700">
                  Expira em: {formatTime(timeLeft)}
                </span>
              </div>
              <Progress value={getProgressValue()} className="w-full max-w-md mx-auto" />
            </div>
          </div>

          {/* Instruções */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-3 flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Como conectar seu WhatsApp:
            </h4>
            <ol className="text-sm text-green-800 space-y-2 list-decimal list-inside">
              <li>Abra o WhatsApp no seu celular</li>
              <li>Toque em "Dispositivos conectados" ou "WhatsApp Web"</li>
              <li>Toque em "Conectar um dispositivo"</li>
              <li>Aponte a câmera para o QR Code acima</li>
              <li>Aguarde a conexão ser estabelecida</li>
            </ol>
          </div>

          {/* Status de monitoramento */}
          {isMonitoring && (
            <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
              </div>
              <span>Aguardando conexão...</span>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={getQRCode}
              disabled={isLoading}
              className="flex-1 text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar QR Code
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="text-gray-600 hover:text-gray-800"
            >
              Fechar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}