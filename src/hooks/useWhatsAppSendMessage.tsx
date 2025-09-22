import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

  return useMutation({
    mutationFn: async (params: SendMessageParams) => {
      console.log('📨 Sending WhatsApp message:', params);

      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      let payload: any = {
        to: params.phoneNumber,
        conversationId: params.conversationId,
      };

      // Add message or attachment
      if (params.mediaId && params.mediaType) {
        console.log('📎 Sending media message:', params.mediaType, params.mediaId);
        payload.attachment = {
          type: params.mediaType,
          mediaId: params.mediaId,
          filename: params.fileName,
          caption: params.caption,
          permanentUrl: params.permanentUrl
        };
      } else if (params.message) {
        console.log('📝 Sending text message');
        payload.message = params.message;
      }

      console.log('📤 Sending to WhatsApp Official API...');

      // Send through our edge function
      const response = await fetch(
        'https://mqotdnvwyjhyiqzbefpm.supabase.co/functions/v1/whatsapp-official-send',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('❌ Message send failed:', result);
        throw new Error(result.error || 'Failed to send message');
      }

      console.log('✅ Message sent successfully:', result);
      return result;
    },
    onSuccess: () => {
      // Invalidate queries to refresh messages and conversations
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      toast.success('Mensagem enviada com sucesso!');
    },
    onError: (error: any) => {
      console.error('❌ Send message error:', error);
      toast.error(`Erro ao enviar mensagem: ${error.message}`);
    },
  });
}