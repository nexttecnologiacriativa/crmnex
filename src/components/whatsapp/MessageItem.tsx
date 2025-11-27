import React from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Check, 
  CheckCheck, 
  Clock, 
  AlertCircle, 
  FileText, 
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AudioPlayer from './AudioPlayer';
import WhatsAppImage from './WhatsAppImage';

interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  message_text: string;
  message_type: string;
  is_from_lead: boolean;
  sent_by: string | null;
  created_at: string;
  timestamp: string;
  message_id: string | null;
  status: string;
  media_url: string | null;
  media_type: string | null;
  attachment_name: string | null;
  permanent_audio_url: string | null;
  whatsapp_media_id: string | null;
}

interface MessageItemProps {
  message: WhatsAppMessage;
  isFromCurrentUser: boolean;
}

export function MessageItem({ message, isFromCurrentUser }: MessageItemProps) {

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'HH:mm', { locale: ptBR });
    } catch {
      return '--:--';
    }
  };

  const getStatusIcon = () => {
    if (message.is_from_lead) return null;

    switch (message.status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-muted-foreground" />;
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-destructive" />;
      default:
        return <Check className="h-3 w-3 text-muted-foreground" />;
    }
  };


  const renderMessageContent = () => {
    switch (message.message_type) {
      case 'text':
        return (
          <div className="whitespace-pre-wrap break-words">
            {message.message_text}
          </div>
        );

      case 'image':
        return (
          <div className="space-y-2">
            {message.media_url && (
              <div className="relative max-w-xs">
                <WhatsAppImage
                  mediaUrl={message.media_url}
                  alt="Imagem compartilhada"
                  className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(message.media_url!, '_blank')}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2 opacity-70 hover:opacity-100"
                  onClick={() => window.open(message.media_url!, '_blank')}
                >
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            )}
            {message.message_text && message.message_text !== 'Imagem' && (
              <div className="text-sm">
                {message.message_text}
              </div>
            )}
          </div>
        );

      case 'audio':
        return (
          <div className="space-y-2">
            {(message.permanent_audio_url || message.media_url) ? (
              <AudioPlayer
                audioUrl={message.media_url || ''}
                permanentUrl={message.permanent_audio_url || undefined}
                messageId={message.id}
                className="max-w-xs"
              />
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                {message.message_text || 'Áudio não disponível'}
              </div>
            )}
          </div>
        );
        
      case 'video':
        return (
          <div className="space-y-2">
            {message.media_url && (
              <div className="relative max-w-xs">
                <video 
                  src={message.media_url}
                  controls
                  className="w-full rounded-lg"
                  style={{ maxHeight: '300px' }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2 opacity-70 hover:opacity-100"
                  onClick={() => window.open(message.media_url!, '_blank')}
                >
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            )}
            {message.message_text && message.message_text !== 'Vídeo' && (
              <div className="text-sm">
                {message.message_text}
              </div>
            )}
          </div>
        );

      case 'document':
        return (
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
            <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {message.attachment_name || message.message_text || 'Documento'}
              </p>
              <p className="text-xs text-muted-foreground">
                {message.media_type || 'Arquivo'}
              </p>
            </div>
            {message.media_url && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(message.media_url!, '_blank')}
                className="flex-shrink-0"
              >
                <Download className="h-3 w-3" />
              </Button>
            )}
          </div>
        );

      default:
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            Tipo de mensagem não suportado
          </div>
        );
    }
  };

  return (
    <div className={cn(
      "flex w-full mb-1",
      isFromCurrentUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-xs lg:max-w-md",
        isFromCurrentUser ? "ml-auto" : "mr-auto"
      )}>
        <div className={cn(
          "rounded-lg px-3 py-2 text-sm",
          isFromCurrentUser 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted"
        )}>
          {renderMessageContent()}
          
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className={cn(
              "text-xs opacity-70"
            )}>
              {formatTime(message.created_at)}
            </span>
            {getStatusIcon()}
          </div>
        </div>
      </div>
    </div>
  );
}