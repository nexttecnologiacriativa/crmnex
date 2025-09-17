import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  Send, 
  FileImage,
  Image,
  Mic, 
  MicOff, 
  Square
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';


interface WhatsAppConversation {
  id: string;
  phone_number: string;
  contact_name: string;
  last_message_at: string;
  is_read: boolean;
  message_count: number;
  workspace_id: string;
}

interface MessageInputProps {
  onSendMessage: (messageData: {
    text?: string;
    imageUrl?: string;
    audioData?: { base64: string; fileName: string };
    mediaData?: { file: File; type: 'image' | 'document' };
  }) => Promise<void>;
  conversation: WhatsAppConversation;
  disabled?: boolean;
  instanceName?: string;
  workspaceId?: string;
}

export function MessageInput({ onSendMessage, conversation, disabled, instanceName, workspaceId }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSendText = async () => {
    if (!message.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage({ text: message.trim() });
      setMessage('');
    } catch (error) {
      toast({
        title: "Erro ao enviar mensagem",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar se é imagem
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Selecione apenas imagens (JPG, PNG, GIF, etc).",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: "Imagem muito grande",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      await onSendMessage({ 
        mediaData: { 
          file, 
          type: 'image' 
        } 
      });
      toast({
        title: "Imagem enviada",
        description: "Sua imagem foi enviada com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao enviar imagem",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
      // Reset input
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar se é documento
    const isDocument = (
      file.type.startsWith('application/') || 
      file.type.startsWith('text/') ||
      file.type === 'audio/mpeg' ||
      file.type === 'audio/wav'
    );

    if (!isDocument) {
      toast({
        title: "Arquivo inválido",
        description: "Selecione um documento válido (PDF, DOC, TXT, etc).",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho
    const maxSize = 16 * 1024 * 1024; // 16MB
    if (file.size > maxSize) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 16MB.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      await onSendMessage({ 
        mediaData: { 
          file, 
          type: 'document' 
        } 
      });
      toast({
        title: "Documento enviado",
        description: "Seu documento foi enviado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao enviar documento",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };


  const handleAudioRecording = async (audioData: { base64: string; fileName: string }) => {
    setIsSending(true);
    try {
      await onSendMessage({ audioData });
    } catch (error) {
      toast({
        title: "Erro ao enviar áudio",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const isDisabled = disabled || isSending;

  return (
    <Card className="border-t rounded-none">
      <div className="p-4 space-y-3">
        {/* Campo de mensagem e botões */}
        <div className="flex items-end gap-2">
          {/* Botão de imagem */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-2"
            disabled={isDisabled}
            onClick={() => imageInputRef.current?.click()}
          >
            <Image className="h-4 w-4" />
          </Button>

          {/* Botão de arquivo */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-2"
            disabled={isDisabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <FileImage className="h-4 w-4" />
          </Button>

          {/* Campo de texto */}
          <div className="flex-1">
            <Input
              placeholder="Digite sua mensagem..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isDisabled}
              className="resize-none min-h-[40px]"
            />
          </div>

          {/* Botão de envio */}
          {message.trim() ? (
            <Button
              onClick={handleSendText}
              disabled={isDisabled}
              size="sm"
              className="p-2"
            >
              <Send className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => setIsRecording(!isRecording)}
              disabled={isDisabled}
              size="sm"
              className="p-2"
              variant={isRecording ? "destructive" : "ghost"}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}
        </div>

        {/* Áudio sender quando estiver gravando */}
        {isRecording && instanceName && workspaceId && (
          <div className="border rounded-lg p-3 bg-muted/50">
            <p className="text-sm text-muted-foreground mb-2">
              Gravação de áudio disponível na interface principal
            </p>
          </div>
        )}

        {/* Input oculto para imagens */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Input oculto para arquivos */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.ppt,.pptx,.zip,.rar,audio/*,video/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </Card>
  );
}