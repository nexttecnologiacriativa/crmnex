import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useWhatsAppInstances } from '@/hooks/useWhatsAppInstance';
import { MessageItem } from './MessageItem';
import { MessageInput } from './MessageInput';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

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

interface WhatsAppConversation {
  id: string;
  phone_number: string;
  contact_name: string;
  last_message_at: string;
  is_read: boolean;
  message_count: number;
  workspace_id: string;
}

interface ChatBoxProps {
  conversation: WhatsAppConversation;
  workspaceId: string;
  className?: string;
}

export function ChatBox({ conversation, workspaceId, className }: ChatBoxProps) {
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { data: instances = [] } = useWhatsAppInstances();
  
  // Usar a primeira instância ativa disponível
  const activeInstance = instances.find(instance => instance.status === 'open') || instances[0];

  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ['whatsapp-messages', conversation.id],
    queryFn: async () => {
      console.log('Fetching messages for conversation:', conversation.id);
      
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }

      console.log('Messages fetched for conversation:', data?.length || 0);
      if (data?.length) {
        console.log('📋 All messages in conversation:', data.map(msg => ({
          id: msg.id,
          type: msg.message_type,
          text: msg.message_text,
          isFromLead: msg.is_from_lead,
          createdAt: msg.created_at
        })));
      }
      return data as WhatsAppMessage[];
    },
    enabled: !!conversation.id,
    refetchInterval: false, // Desabilitar polling para economizar créditos
  });

  // Auto-scroll para a última mensagem
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Real-time subscription para novas mensagens - OPTIMIZED
  useEffect(() => {
    if (!conversation.id) return;

    console.log('🔌 Setting up realtime subscription for conversation:', conversation.id);

    const channel = supabase
      .channel(`messages-${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `conversation_id=eq.${conversation.id}`
        },
        (payload) => {
          console.log('📨 New message received via realtime:', payload);
          console.log('📨 Message details:', {
            messageType: payload.new?.message_type,
            messageText: payload.new?.message_text,
            isFromLead: payload.new?.is_from_lead,
            messageId: payload.new?.message_id
          });
          
          // Adicionar nova mensagem diretamente ao cache em vez de refetch completo
          queryClient.setQueryData(
            ['whatsapp-messages', conversation.id],
            (oldData: WhatsAppMessage[] = []) => {
              // Verificar se a mensagem já existe no cache (evitar duplicação)
              const messageExists = oldData.some(msg => msg.id === payload.new.id);
              if (messageExists) {
                console.log('⏭️ Message already in cache, skipping:', payload.new.id);
                return oldData;
              }
              console.log('➕ Adding new message to cache:', payload.new.id);
              return [...oldData, payload.new as WhatsAppMessage];
            }
          );
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    return () => {
      console.log('🔌 Cleaning up subscription for conversation:', conversation.id);
      supabase.removeChannel(channel);
    };
  }, [conversation.id, queryClient]);

  // Marcar conversa como lida quando aberta
  useEffect(() => {
    if (conversation.id && !conversation.is_read) {
      const markAsRead = async () => {
        const { error } = await supabase
          .from('whatsapp_conversations')
          .update({ is_read: true })
          .eq('id', conversation.id);

        if (!error) {
          // Invalidar cache das conversas para atualizar a lista
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations', workspaceId] });
        }
      };

      markAsRead();
    }
  }, [conversation.id, conversation.is_read, workspaceId, queryClient]);

  // Removed handleSendMessage - now handled by MessageInput component

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-muted-foreground">Carregando mensagens...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-muted-foreground">
                Nenhuma mensagem ainda. Inicie a conversa!
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const showDateSeparator = index === 0 || 
                new Date(message.created_at).toDateString() !== 
                new Date(messages[index - 1].created_at).toDateString();

              return (
                <div key={message.id}>
                  {showDateSeparator && (
                    <div className="flex justify-center my-4">
                      <span className="px-3 py-1 text-xs text-muted-foreground bg-muted rounded-full">
                        {new Date(message.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                  <MessageItem
                    message={message}
                    isFromCurrentUser={!message.is_from_lead}
                  />
                </div>
              );
            })}
            
            {isTyping && (
              <div className="flex justify-start">
                <Card className="p-3 bg-muted">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </Card>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input de mensagem */}
      <MessageInput
        conversationId={conversation.id}
        phoneNumber={conversation.phone_number}
        disabled={isTyping}
        instanceName={activeInstance?.instance_name}
        workspaceId={workspaceId}
      />
    </div>
  );
}