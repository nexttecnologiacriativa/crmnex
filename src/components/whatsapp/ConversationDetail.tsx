
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trash2, ArrowLeft, UserPlus, ExternalLink } from 'lucide-react';
import { useDeleteWhatsAppMessage } from '@/hooks/useWhatsAppOfficial';
import { useWhatsAppMessages } from '@/hooks/useWhatsApp';
import { MessageInput } from './MessageInput';
import AttachmentPreview from './AttachmentPreview';
import AudioPlayer from './AudioPlayer';
import WhatsAppImage from './WhatsAppImage';
import CreateLeadFromConversationDialog from './CreateLeadFromConversationDialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLeads } from '@/hooks/useLeads';
import { phonesMatch } from '@/lib/phone';
import { useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  message_text: string;
  message_type: string;
  is_from_lead: boolean;
  timestamp: string;
  status?: string;
  media_url?: string;
  media_type?: string;
  attachment_name?: string;
  message_id?: string;
  permanent_audio_url?: string;
}

interface ConversationDetailProps {
  conversationId: string;
  onBack: () => void;
}

export default function ConversationDetail({ conversationId, onBack }: ConversationDetailProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const deleteMessage = useDeleteWhatsAppMessage();
  const { data: messages = [], isLoading } = useWhatsAppMessages(conversationId);
  const { data: leads = [] } = useLeads();
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const navigate = useNavigate();

  // Get conversation details for phone number
  const { data: conversation } = useQuery({
    queryKey: ['whatsapp-conversation', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('phone_number, contact_name')
        .eq('id', conversationId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });

  // Find if lead exists for this conversation
  const leadForConversation = conversation?.phone_number 
    ? leads.find(lead => lead.phone && phonesMatch(lead.phone, conversation.phone_number))
    : null;

  console.log('🔍 ConversationDetail - Lead check:', {
    hasConversation: !!conversation,
    phoneNumber: conversation?.phone_number,
    totalLeads: leads.length,
    leadForConversation: leadForConversation ? {
      id: leadForConversation.id,
      name: leadForConversation.name,
      phone: leadForConversation.phone
    } : null
  });

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage.mutateAsync({ messageId });
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const renderMessageContent = (message: Message) => {
    console.log('🔍 📋 ConversationDetail - Rendering message:', {
      id: message.id,
      type: message.message_type,
      text: message.message_text,
      mediaUrl: message.media_url,
      mediaType: message.media_type,
      isFromLead: message.is_from_lead,
      hasMediaUrl: !!message.media_url,
      hasPermanentAudioUrl: !!message.permanent_audio_url,
      messageId: message.message_id
    });

    // Mensagem de áudio
    if (message.message_type === 'audio') {
      // Priorizar permanent_audio_url se disponível, senão usar media_url
      let audioUrl = message.permanent_audio_url || message.media_url;
      
      console.log('🎵 📋 DETAILED AUDIO DEBUG for message:', {
        id: message.id,
        messageId: message.message_id,
        type: message.message_type,
        mediaUrl: message.media_url,
        permanentAudioUrl: message.permanent_audio_url,
        finalAudioUrl: audioUrl,
        messageText: message.message_text,
        mediaType: message.media_type,
        attachmentName: message.attachment_name,
        isFromLead: message.is_from_lead,
        audioUrlExists: !!audioUrl,
        timestamp: message.timestamp,
        
        // 🔍 DETAILED STATUS
        canPlay: !!audioUrl,
        reason: !audioUrl ? 'NO_URL' : 'CAN_PLAY'
      });

      // Se não tiver audio URL, verificar se message_text contém URL
      if (!audioUrl && message.message_text && message.message_text.startsWith('http')) {
        audioUrl = message.message_text;
        console.log('🎵 Using message_text as audio URL:', audioUrl);
      }

      console.log('🎵 Final audio URL for rendering:', audioUrl, 'Will render AudioPlayer:', !!audioUrl);

      // Sempre renderizar AudioPlayer, mas com diferentes comportamentos
      console.log('🎵 📋 Rendering AudioPlayer:', {
        audioUrl,
        isFromLead: message.is_from_lead,
        willPlay: message.is_from_lead && !!audioUrl
      });
      
      return (
        <div className="space-y-2">
          {/* Debug info visual */}
          <div className="text-xs text-gray-500 mb-1 font-mono bg-yellow-50 p-1 rounded">
            📋 {message.is_from_lead ? '📥 RECEBIDO' : '📤 ENVIADO'} | 
            URL: {audioUrl ? '✅' : '❌'} | 
            Permanent: {message.permanent_audio_url ? '✅' : '❌'} |
            Can Play: {!!audioUrl ? '✅' : '❌'}
            <br />
            🔗 URL: {audioUrl ? audioUrl.substring(0, 60) + '...' : 'Nenhuma'}
          </div>
          
          <AudioPlayer 
            audioUrl={audioUrl || ''} 
            messageId={message.message_id}
            permanentUrl={message.permanent_audio_url}
          />
          
          {/* Informações adicionais de debug */}
          <div className="text-xs text-blue-600 mt-1 font-mono bg-blue-50 p-1 rounded">
            🎵 DEBUG: AudioPlayer renderizado com URL={audioUrl ? 'SIM' : 'NÃO'} | 
            Permanent={message.permanent_audio_url ? 'SIM' : 'NÃO'} | 
            isFromLead={message.is_from_lead ? 'SIM' : 'NÃO'}
          </div>
          {/* Mostrar texto apenas se não for o texto padrão de áudio */}
          {message.message_text && 
           !message.message_text.startsWith('http') && 
           message.message_text !== '🎤 Mensagem de áudio' &&
           message.message_text.trim() !== '' && (
            <p className="text-sm">{message.message_text}</p>
          )}
        </div>
      );
    }

    // Mensagem com mídia (imagem/vídeo/documento)
    if (message.media_url && message.message_type !== 'text') {
      return (
        <div className="space-y-2">
          <div className="attachment-preview">
            {(message.media_type?.startsWith('image/') || message.message_type === 'image') ? (
              <WhatsAppImage 
                mediaUrl={message.media_url || ''} 
                alt={message.attachment_name || 'Attachment'}
                className="max-w-xs rounded-lg"
              />
            ) : (message.media_type?.startsWith('video/') || message.message_type === 'video') ? (
              <video 
                src={message.media_url} 
                controls 
                className="max-w-xs rounded-lg"
                onError={(e) => {
                  console.error('Error loading video:', message.media_url);
                }}
              />
            ) : (
              <div className="flex items-center gap-2 p-2 bg-gray-100 rounded">
                <span className="text-sm">{message.attachment_name || 'Arquivo'}</span>
              </div>
            )}
          </div>
          {message.message_text && message.message_text !== '📷 Imagem' && (
            <p className="text-sm">{message.message_text}</p>
          )}
        </div>
      );
    }

    // Mensagem de texto
    return <p className="text-sm whitespace-pre-wrap">{message.message_text}</p>;
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Carregando mensagens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with back button */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button 
            onClick={onBack}
            variant="ghost"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <h2 className="font-semibold">{conversation?.contact_name || 'Conversa'}</h2>
        </div>
        
        {leadForConversation ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
            onClick={() => navigate(`/leads/${leadForConversation.id}`)}
          >
            <ExternalLink className="h-4 w-4" />
            Ver Lead
          </Button>
        ) : conversation && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700"
            onClick={() => setCreateLeadOpen(true)}
          >
            <UserPlus className="h-4 w-4" />
            Cadastrar Lead
          </Button>
        )}
      </div>

      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p>Nenhuma mensagem ainda</p>
            <p className="text-sm">Envie uma mensagem para começar a conversa</p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.is_from_lead ? 'justify-start' : 'justify-end'
                }`}
              >
                <div
                  className={`group relative max-w-[70%] rounded-lg p-3 ${
                    message.is_from_lead
                      ? 'bg-gray-100 text-gray-900'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  {renderMessageContent(message)}
                  
                  <div className={`flex items-center justify-between mt-2 text-xs ${
                    message.is_from_lead ? 'text-gray-500' : 'text-blue-100'
                  }`}>
                    <span>
                      {formatDistanceToNow(new Date(message.timestamp), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                    
                    {!message.is_from_lead && (
                      <div className="flex items-center space-x-1">
                        {message.status && (
                          <span className="text-xs opacity-75">
                            {message.status === 'sent' && '✓'}
                            {message.status === 'delivered' && '✓✓'}
                            {message.status === 'read' && '✓✓'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Delete button for sent messages */}
                  {!message.is_from_lead && (
                    <Button
                      onClick={() => handleDeleteMessage(message.id)}
                      size="sm"
                      variant="ghost"
                      className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full"
                      disabled={deleteMessage.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
      
      {/* Message Input */}
      <MessageInput
        conversationId={conversationId}
        phoneNumber={conversation?.phone_number || 'unknown'}
        disabled={false}
      />

      {/* Create Lead Dialog */}
      {conversation && (
        <CreateLeadFromConversationDialog
          open={createLeadOpen}
          onOpenChange={setCreateLeadOpen}
          phoneNumber={conversation.phone_number}
          contactName={conversation.contact_name || ''}
          conversationId={conversationId}
          onLeadCreated={() => {
            setCreateLeadOpen(false);
          }}
        />
      )}
    </div>
  );
}
