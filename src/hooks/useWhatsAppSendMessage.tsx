import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWorkspace } from './useWorkspace';
import { useWhatsAppInstances } from './useWhatsAppInstance';

interface SendMessageParams {
  conversationId: string;
  phoneNumber: string;
  message?: string;
  mediaId?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  fileName?: string;
  caption?: string;
  permanentUrl?: string;
}

export function useWhatsAppSendMessage() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { data: instances = [] } = useWhatsAppInstances();

  return useMutation({
    mutationFn: async (params: SendMessageParams) => {
      console.log('📨 Sending WhatsApp message:', params);

      // Get active instance
      const activeInstance = instances.find(instance => instance.status === 'open') || instances[0];
      if (!activeInstance) {
        throw new Error('Nenhuma instância do WhatsApp conectada. Configure uma instância primeiro.');
      }

      // Get API configuration from localStorage
      const configKey = `evolution_config_${currentWorkspace?.id}`;
      const storedConfig = localStorage.getItem(configKey);
      const config = storedConfig ? JSON.parse(storedConfig) : null;
      
      if (!config?.global_api_key) {
        throw new Error('Configure a API Key da Evolution primeiro');
      }

      if (params.message) {
        // Send text message
        console.log('📝 Sending text message');
        const { error } = await supabase.functions.invoke('whatsapp-evolution', {
          body: {
            action: 'send_message',
            instanceName: activeInstance.instance_name,
            phone: params.phoneNumber,
            message: params.message,
            workspaceId: currentWorkspace?.id,
            apiKey: config.global_api_key,
            apiUrl: config.api_url,
          }
        });
        
        if (error) throw error;
      } else if (params.mediaId && params.mediaType && params.permanentUrl) {
        // Send media message using permanent URL
        console.log('📎 Sending media message:', params.mediaType, params.permanentUrl);
        const { data, error } = await supabase.functions.invoke('whatsapp-evolution', {
          body: {
            action: 'sendMediaUrl',
            instanceName: activeInstance.instance_name,
            number: params.phoneNumber,
            mediaUrl: params.permanentUrl,
            mediaType: params.mediaType,
            fileName: params.fileName,
            caption: params.caption,
            workspaceId: currentWorkspace?.id,
            apiKey: config.global_api_key,
            apiUrl: config.api_url,
          }
        });
        
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      } else {
        throw new Error('Parâmetros inválidos para envio de mensagem');
      }

      console.log('✅ Message sent successfully');
      return { success: true };
    },
    onSuccess: () => {
      // A subscription em tempo real no ChatBox já cuida do refetch das mensagens
      // Apenas invalidar conversações para atualizar a lista/contadores
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      toast.success('Mensagem enviada com sucesso!');
    },
    onError: (error: any) => {
      console.error('❌ Send message error:', error);
      
      // Extract detailed error information
      let errorMessage = 'Erro desconhecido';
      
      if (error?.message) {
        errorMessage = error.message;
      }
      
      // If there's additional context in the error object
      if (error?.context) {
        errorMessage += `\n\nDetalhes: ${JSON.stringify(error.context, null, 2)}`;
      }
      
      // Show full error details
      console.error('📋 Full error details:', JSON.stringify(error, null, 2));
      
      toast.error(`Erro ao enviar mensagem:\n${errorMessage}`, {
        duration: 8000,
      });
    },
  });
}