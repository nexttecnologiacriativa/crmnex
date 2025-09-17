import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Send,
  MessageSquare,
  Phone,
  Image,
  Paperclip,
  Mic,
  File,
  CheckCircle,
  AlertCircle,
  Loader2,
  User
} from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';


interface WhatsAppInstance {
  id: string;
  instance_name: string;
  status: string;
  phone_number?: string;
}

interface MessageSenderProps {
  instances: WhatsAppInstance[];
}

interface SentMessage {
  id: string;
  text: string;
  phone: string;
  instance: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'failed';
}

export default function MessageSender({ instances }: MessageSenderProps) {
  const { currentWorkspace } = useWorkspace();
  const [selectedInstance, setSelectedInstance] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);

  const connectedInstances = instances.filter(instance => instance.status === 'open');

  useEffect(() => {
    if (connectedInstances.length > 0 && !selectedInstance) {
      setSelectedInstance(connectedInstances[0].instance_name);
    }
  }, [connectedInstances, selectedInstance]);

  // Configure webhook automatically when connected instances change
  useEffect(() => {
    const configureWebhook = async () => {
      const config = getEvolutionConfig();
      if (!config?.apiUrl || !config?.apiKey) return;
      
      const connectedInstance = connectedInstances[0];
      if (!connectedInstance) return;
      
      try {
        console.log('🔧 Auto-configuring webhook with Base64 for instance:', connectedInstance.instance_name);
        await supabase.functions.invoke('whatsapp-evolution', {
          body: {
            action: 'configure_webhook',
            instanceName: connectedInstance.instance_name,
            workspaceId: currentWorkspace?.id,
            apiUrl: config.apiUrl,
            apiKey: config.apiKey
          }
        });
        console.log('✅ Webhook configured with webhook_base64=true successfully');
      } catch (error) {
        console.error('❌ Error configuring webhook:', error);
      }
    };
    
    configureWebhook();
  }, [connectedInstances, currentWorkspace]);

  const getEvolutionConfig = () => {
    if (!currentWorkspace) return null;
    const configKey = `evolution_config_${currentWorkspace.id}`;
    const stored = localStorage.getItem(configKey);
    return stored ? JSON.parse(stored) : null;
  };

  const formatPhoneNumber = (phone: string) => {
    // Apenas remove caracteres não numéricos; não aplica máscara nem prefixos automaticamente
    return phone.replace(/\D/g, '');
  };

  const validatePhoneNumber = (phone: string) => {
    const formatted = formatPhoneNumber(phone);
    return formatted.length >= 12 && formatted.length <= 15;
  };

  const sendMessage = async () => {
    if (!message.trim() || !phoneNumber.trim() || !selectedInstance) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      toast.error('Número de telefone inválido. Use o formato: 5511999999999');
      return;
    }

    const config = getEvolutionConfig();
    if (!config?.global_api_key) {
      toast.error('Configure a API key primeiro');
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    const messageId = Date.now().toString();

    // Adicionar mensagem como "enviando"
    const newMessage: SentMessage = {
      id: messageId,
      text: message.trim(),
      phone: formattedPhone,
      instance: selectedInstance,
      timestamp: new Date(),
      status: 'sending'
    };

    setSentMessages(prev => [newMessage, ...prev]);
    setIsSending(true);

    try {
      const response = await supabase.functions.invoke('whatsapp-evolution', {
        body: {
          action: 'send_message',
          instanceName: selectedInstance,
          phone: formattedPhone,
          message: message.trim(),
          apiKey: config.global_api_key
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao enviar mensagem');
      }

      // Atualizar status para "enviado"
      setSentMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, status: 'sent' }
            : msg
        )
      );

      toast.success('Mensagem enviada com sucesso!');
      setMessage('');

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Atualizar status para "falhou"
      setSentMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, status: 'failed' }
            : msg
        )
      );

      toast.error(`Erro ao enviar mensagem: ${(error as Error).message}`);
    } finally {
      setIsSending(false);
    }
  };


  const handlePhoneChange = (value: string) => {
    // Não aplicar máscara no campo; manter exatamente como digitado
    setPhoneNumber(value);
  };

  const getMessageStatusIcon = (status: SentMessage['status']) => {
    switch (status) {
      case 'sending':
        return <Loader2 className="h-3 w-3 animate-spin text-yellow-600" />;
      case 'sent':
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-600" />;
    }
  };

  const getMessageStatusColor = (status: SentMessage['status']) => {
    switch (status) {
      case 'sending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'sent':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  if (connectedInstances.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
              <MessageSquare className="h-8 w-8 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Nenhuma instância conectada</h3>
              <p className="text-gray-600">
                Conecte pelo menos uma instância do WhatsApp para enviar mensagens
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Formulário de envio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-green-600" />
            Enviar Mensagem WhatsApp
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="instance_select">Instância</Label>
              <select
                id="instance_select"
                className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
                value={selectedInstance}
                onChange={(e) => setSelectedInstance(e.target.value)}
              >
                {connectedInstances.map(instance => (
                  <option key={instance.id} value={instance.instance_name}>
                    {instance.instance_name} 
                    {instance.phone_number && ` - ${instance.phone_number}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="phone_input" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Número do WhatsApp *
              </Label>
              <Input
                id="phone_input"
                placeholder="5511999999999"
                value={phoneNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Formato: Código do país + DDD + número (ex: 5511999999999)
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="message_input" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Mensagem *
            </Label>
            <Textarea
              id="message_input"
              placeholder="Digite sua mensagem..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="resize-none min-h-[100px] mt-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Pressione Ctrl+Enter para enviar rapidamente
            </p>
          </div>

          {/* Tipos de mídia */}
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Envio de mídia:</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled className="opacity-50">
                <Mic className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" size="sm" disabled className="opacity-50">
                <Image className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled className="opacity-50">
                <File className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled className="opacity-50">
                <Paperclip className="h-4 w-4" />
              </Button>
            </div>
            <span className="text-xs text-gray-500">(Áudio/Imagem/Arquivo em breve)</span>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={sendMessage}
              disabled={!message.trim() || !phoneNumber.trim() || !selectedInstance || isSending}
              className="bg-green-600 hover:bg-green-700 flex-1"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {isSending ? 'Enviando...' : 'Enviar Mensagem'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de mensagens enviadas */}
      {sentMessages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mensagens Enviadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {sentMessages.map((msg) => (
                <div key={msg.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-sm">{msg.phone}</span>
                        <Badge variant="outline" className={getMessageStatusColor(msg.status)}>
                          {getMessageStatusIcon(msg.status)}
                          <span className="ml-1 capitalize">{msg.status}</span>
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700">{msg.text}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Instância: {msg.instance}</span>
                        <span>{msg.timestamp.toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}