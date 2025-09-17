
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';
import { toast } from 'sonner';

interface WhatsAppOfficialConfig {
  id: string;
  workspace_id: string;
  access_token: string | null;
  phone_number_id: string | null;
  webhook_verify_token: string | null;
  app_secret: string | null;
  business_account_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useWhatsAppOfficialConfig() {
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ['whatsapp-official-config', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;
      
      const { data, error } = await supabase
        .from('whatsapp_official_configs')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as WhatsAppOfficialConfig | null;
    },
    enabled: !!currentWorkspace,
  });
}

export function useUploadMedia() {
  return useMutation({
    mutationFn: async ({ fileData, mimeType, filename }: {
      fileData: string;
      mimeType: string;
      filename: string;
    }) => {
      console.log('Uploading media:', { mimeType, filename });

      const { data, error } = await supabase.functions.invoke('whatsapp-media-upload', {
        body: { fileData, mimeType, filename }
      });

      if (error) {
        console.error('Media upload error:', error);
        throw error;
      }

      if (!data.success) {
        console.error('Media upload failed:', data);
        throw new Error(data.error || 'Failed to upload media');
      }

      return data;
    },
    onError: (error: any) => {
      console.error('Upload media error:', error);
      toast.error('Erro ao fazer upload: ' + (error.message || 'Erro desconhecido'));
    },
  });
}

export function useSendWhatsAppOfficialMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      to, 
      message,
      conversationId,
      attachment
    }: {
      to: string;
      message: string;
      conversationId?: string;
      attachment?: {
        type: string;
        mediaId: string;
        filename: string;
        caption?: string;
      };
    }) => {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('Sending WhatsApp message:', { to, message, conversationId, messageId, hasAttachment: !!attachment });

      const { data, error } = await supabase.functions.invoke('whatsapp-official-send', {
        body: {
          to: to.replace(/\D/g, ''),
          message,
          conversationId,
          messageId,
          attachment
        }
      });

      console.log('📤 WhatsApp send response:', { data, error });

      if (error) {
        console.error('❌ Supabase function error:', error);
        throw error;
      }

      if (!data.success) {
        console.error('❌ WhatsApp send failed:', data);
        throw new Error(data.error || 'Failed to send message');
      }

      console.log('✅ Message sent successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      toast.success('Mensagem enviada via WhatsApp!');
    },
    onError: (error: any) => {
      console.error('Send message error:', error);
      toast.error('Erro ao enviar mensagem: ' + (error.message || 'Erro desconhecido'));
    },
  });
}

export function useDeleteWhatsAppMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ messageId }: { messageId: string }) => {
      console.log('Deleting WhatsApp message:', messageId);

      const { data, error } = await supabase.functions.invoke('whatsapp-delete-message', {
        body: { messageId }
      });

      if (error) {
        console.error('Delete message error:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete message');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      toast.success('Mensagem apagada para todos!');
    },
    onError: (error: any) => {
      console.error('Delete message error:', error);
      toast.error('Erro ao apagar mensagem: ' + (error.message || 'Erro desconhecido'));
    },
  });
}
