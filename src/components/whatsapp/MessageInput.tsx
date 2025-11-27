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
  Square,
  Loader2,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useWhatsAppMediaUpload } from '@/hooks/useWhatsAppMediaUpload';
import { useWhatsAppSendMessage } from '@/hooks/useWhatsAppSendMessage';


interface MessageInputProps {
  conversationId: string;
  phoneNumber: string;
  disabled?: boolean;
  instanceName?: string;
  workspaceId?: string;
}

export function MessageInput({ conversationId, phoneNumber, disabled, instanceName, workspaceId }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<number>(0);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const mediaUpload = useWhatsAppMediaUpload();
  const sendMessage = useWhatsAppSendMessage();

  const isSending = mediaUpload.isPending || sendMessage.isPending;

  const handleSendText = async () => {
    if (!message.trim() || isSending || isSubmitting) return;

    // Prevenir cliques rápidos (cooldown de 1s)
    const now = Date.now();
    if (now - lastSentAt < 1000) {
      toast({
        title: "Aguarde",
        description: "Aguarde um momento antes de enviar outra mensagem",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true); // Trava imediata

    try {
      await sendMessage.mutateAsync({
        conversationId,
        phoneNumber,
        message: message.trim()
      });
      setMessage('');
      setLastSentAt(Date.now()); // Registrar timestamp
    } catch (error) {
      // Error handling is done in the mutation
    } finally {
      setIsSubmitting(false); // Libera após conclusão
    }
  };

  const handleSendImage = async () => {
    if (!selectedImage || isSending || isSubmitting) return;

    // Prevenir cliques rápidos (cooldown de 1s)
    const now = Date.now();
    if (now - lastSentAt < 1000) {
      toast({
        title: "Aguarde",
        description: "Aguarde um momento antes de enviar outra imagem",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true); // Trava imediata

    try {
      // First upload the image to get mediaId
      const uploadResult = await mediaUpload.mutateAsync({
        file: selectedImage,
        mediaType: 'image'
      });

      // Then send the message with the mediaId
      await sendMessage.mutateAsync({
        conversationId,
        phoneNumber,
        mediaId: uploadResult.mediaId,
        mediaType: 'image',
        fileName: selectedImage.name,
        caption: caption || undefined,
        permanentUrl: uploadResult.permanentUrl
      });

      // Clear the selected image and preview
      setSelectedImage(null);
      setImagePreview(null);
      setCaption('');
      setLastSentAt(Date.now()); // Registrar timestamp
    } catch (error) {
      // Error handling is done in the mutations
    } finally {
      setIsSubmitting(false); // Libera após conclusão
    }
  };

  const clearImageSelection = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setCaption('');
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
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

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    setSelectedImage(file);
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

    try {
      // First upload the document to get mediaId
      const uploadResult = await mediaUpload.mutateAsync({
        file,
        mediaType: 'document'
      });

      // Then send the message with the mediaId
      await sendMessage.mutateAsync({
        conversationId,
        phoneNumber,
        mediaId: uploadResult.mediaId,
        mediaType: 'document',
        fileName: file.name,
        permanentUrl: uploadResult.permanentUrl
      });

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      // Error handling is done in the mutations
    }
  };

  const handleAudioRecording = async (audioData: { base64: string; fileName: string }) => {
    // Audio recording is handled by the main interface component
    console.log('Audio recording triggered:', audioData);
  };

  const isDisabled = disabled || isSending || isSubmitting;

  return (
    <Card className="border-t rounded-none">
      <div className="p-4 space-y-3">
        {/* Image preview */}
        {imagePreview && selectedImage && (
          <div className="relative bg-gray-50 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="w-20 h-20 object-cover rounded"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{selectedImage.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Input
                  placeholder="Adicionar legenda (opcional)..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="mt-2"
                  disabled={isDisabled}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearImageSelection}
                disabled={isDisabled}
                className="p-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                onClick={handleSendImage}
                disabled={isDisabled}
                size="sm"
                className="flex-1"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar Imagem
              </Button>
              <Button
                variant="outline"
                onClick={clearImageSelection}
                disabled={isDisabled}
                size="sm"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Campo de mensagem e botões - only show if no image is selected */}
        {!selectedImage && (
          <div className="flex items-end gap-2">
            {/* Botão de imagem */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2"
              disabled={isDisabled}
              onClick={() => {
                console.log('📸 Clicando no botão de imagem');
                imageInputRef.current?.click();
              }}
              title="Enviar imagem"
            >
              <Image className="h-4 w-4 text-green-600" />
            </Button>

            {/* Botão de arquivo */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2"
              disabled={isDisabled}
              onClick={() => {
                console.log('📄 Clicando no botão de arquivo');
                fileInputRef.current?.click();
              }}
              title="Enviar documento"
            >
              <FileImage className="h-4 w-4 text-blue-600" />
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
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
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
        )}

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
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleImageUpload}
          className="hidden"
          onClick={(e) => {
            console.log('📸 Input de imagem clicado');
            // Reset value to allow selecting the same file again
            e.currentTarget.value = '';
          }}
        />

        {/* Input oculto para arquivos */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.ppt,.pptx,.zip,.rar"
          onChange={handleFileUpload}
          className="hidden"
          onClick={(e) => {
            console.log('📄 Input de arquivo clicado');
            // Reset value to allow selecting the same file again
            e.currentTarget.value = '';
          }}
        />
      </div>
    </Card>
  );
}