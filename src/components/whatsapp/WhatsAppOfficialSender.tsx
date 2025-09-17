import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Mic, Paperclip, X } from 'lucide-react';
import { useSendWhatsAppOfficialMessage, useUploadMedia } from '@/hooks/useWhatsAppOfficial';
import { supabase } from '@/integrations/supabase/client';
import { useWhatsAppTemplates } from '@/hooks/useWhatsApp';
import { useWorkspace } from '@/hooks/useWorkspace';
import { toast } from 'sonner';
// import AudioRecorder from './AudioRecorder'; // Temporariamente removido - problemas com conversão de áudio

interface WhatsAppOfficialSenderProps {
  phoneNumber: string;
  conversationId: string;
  onMessageSent?: () => void;
}

interface AttachmentData {
  name: string;
  type: string;
  size: number;
  base64: string;
  preview?: string;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export default function WhatsAppOfficialSender({ 
  phoneNumber, 
  conversationId, 
  onMessageSent 
}: WhatsAppOfficialSenderProps) {
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<AttachmentData | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { currentWorkspace } = useWorkspace();
  const sendMessage = useSendWhatsAppOfficialMessage();
  const uploadMedia = useUploadMedia();
  const { data: templates = [] } = useWhatsAppTemplates(currentWorkspace?.id);

  const handleSendMessage = async () => {
    if (!message.trim() && !attachment) return;
    if (isUploading || isSending) return;

    setIsSending(true);

    try {
      let attachmentData = null;

      if (attachment) {
        const uploadResult = await uploadMedia.mutateAsync({
          fileData: attachment.base64,
          mimeType: attachment.type,
          filename: attachment.name
        });

        if (uploadResult.success) {
          let attachmentType = 'document';
          if (attachment.type.startsWith('image/')) attachmentType = 'image';
          else if (attachment.type.startsWith('video/')) attachmentType = 'video';
          else if (attachment.type.startsWith('audio/')) attachmentType = 'audio';

          attachmentData = {
            type: attachmentType,
            mediaId: uploadResult.mediaId,
            filename: attachment.name,
            caption: message.trim() || undefined
          };
        } else {
          toast.error('Erro no upload do anexo');
          return;
        }
      }

      await sendMessage.mutateAsync({
        to: phoneNumber,
        message: message.trim(),
        conversationId,
        attachment: attachmentData
      });

      setMessage('');
      setAttachment(null);
      onMessageSent?.();

    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  };

  // Função temporariamente removida - problemas com conversão de áudio
  // const handleSendAudio = async (audioData: {...}) => {...}

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || isUploading) return;

    if (file.size > 16 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 16MB');
      return;
    }

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setAttachment({
        name: file.name,
        type: file.type,
        size: file.size,
        base64: base64.split(',')[1],
        preview: file.type.startsWith('image/') ? base64 : undefined
      });
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
    if (event.target) event.target.value = '';
  };

  const handleTemplateSelect = (template: any) => {
    setMessage(template.content);
    setShowTemplates(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    if (value.endsWith('/')) setShowTemplates(true);
    else if (!value.includes('/')) setShowTemplates(false);
  };

  return (
    <div className="p-4 bg-gray-50 space-y-3">
      {attachment && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {attachment.preview ? (
                <img src={attachment.preview} alt={attachment.name} className="w-10 h-10 object-cover rounded" />
              ) : (
                <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">📄</div>
              )}
              <div>
                <p className="text-sm font-medium">{attachment.name}</p>
                <p className="text-xs text-gray-500">{(attachment.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            <button onClick={() => setAttachment(null)} className="p-1 text-blue-600 hover:text-blue-800 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem ou / para templates..."
            className="min-h-[40px] max-h-[120px] resize-none pr-12"
            disabled={isSending || isUploading}
          />

          {showTemplates && templates.length > 0 && (
            <div className="absolute bottom-full mb-2 left-0 bg-white border rounded-lg shadow-lg p-2 z-10 max-h-40 overflow-y-auto">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="block w-full text-left p-2 hover:bg-gray-100 rounded text-sm"
                >
                  {template.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-1">
          <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSending || isUploading}>
            <Paperclip className="h-4 w-4" />
          </Button>
          {/* AudioRecorder temporariamente removido - problemas com conversão de áudio */}
          <Button onClick={handleSendMessage} disabled={(!message.trim() && !attachment) || isSending || isUploading} size="sm" className="bg-green-600 hover:bg-green-700">
            {isSending ? 'Enviando...' : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        onChange={handleFileSelect}
      />
    </div>
  );
}