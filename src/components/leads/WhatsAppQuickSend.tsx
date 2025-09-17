
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send } from 'lucide-react';
import { useSendWhatsAppOfficialMessage, useWhatsAppOfficialConfig } from '@/hooks/useWhatsAppOfficial';

interface WhatsAppQuickSendProps {
  leadName: string;
  phoneNumber: string;
  leadId?: string;
}

export default function WhatsAppQuickSend({ leadName, phoneNumber, leadId }: WhatsAppQuickSendProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const { data: config } = useWhatsAppOfficialConfig();
  const sendMessage = useSendWhatsAppOfficialMessage();

  const isConfigured = config?.is_active && config?.access_token && config?.phone_number_id;

  const handleSend = async () => {
    if (!message.trim() || !isConfigured) return;

    try {
      await sendMessage.mutateAsync({
        to: phoneNumber,
        message: message.trim()
      });

      setMessage('');
      setIsOpen(false);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!isConfigured || !phoneNumber) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <MessageCircle className="h-4 w-4 mr-1" />
          WhatsApp
        </Button>
      </DialogTrigger>
      
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Enviar WhatsApp para {leadName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Para: {phoneNumber}</span>
            <Badge className="bg-green-100 text-green-800">
              WhatsApp Business API
            </Badge>
          </div>

          <Textarea
            placeholder={`Olá ${leadName}, tudo bem?`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[100px]"
          />

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSend}
              disabled={!message.trim() || sendMessage.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Send className="h-4 w-4 mr-2" />
              {sendMessage.isPending ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
