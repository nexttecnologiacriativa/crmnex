import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SendWhatsAppReplyParams {
  threadId: string;
  text: string;
  customFields?: Record<string, any>;
}

interface WebhookMessage {
  id: string;
  thread_id: string;
  from_me: boolean;
  push_name?: string;
  message_type: string;
  text?: string;
  timestamp: number;
  custom_fields: Record<string, any>;
  raw: any;
  created_at: string;
}

/**
 * Hook para enviar respostas via WhatsApp usando a Evolution API
 */
export function useSendWhatsAppReply() {
  return useMutation({
    mutationFn: async ({ threadId, text }: SendWhatsAppReplyParams) => {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-reply', {
        body: { threadId, text }
      });

      if (error) {
        throw new Error(`Failed to send WhatsApp reply: ${error.message}`);
      }

      return data;
    },
  });
}

/**
 * Hook para buscar mensagens da webhook do Evolution API
 */
export function useWebhookMessages() {
  return useMutation({
    mutationFn: async (threadId?: string) => {
      let query = supabase
        .from('whatsapp_webhook_messages')
        .select('*')
        .order('timestamp', { ascending: false });

      if (threadId) {
        query = query.eq('thread_id', threadId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch webhook messages: ${error.message}`);
      }

      return data;
    },
  });
}