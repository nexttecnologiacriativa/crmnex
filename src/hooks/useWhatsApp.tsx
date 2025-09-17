import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';
import { toast } from 'sonner';

interface WhatsAppConversation {
  id: string;
  workspace_id: string;
  lead_id: string | null;
  phone_number: string;
  contact_name: string | null;
  last_message_at: string;
  is_read: boolean;
  message_count: number;
  created_at: string;
  updated_at: string;
  leads?: {
    name: string;
    email: string;
  };
}

interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  message_text: string;
  message_type: string;
  is_from_lead: boolean;
  sent_by: string | null;
  message_id: string | null;
  status: string | null;
  timestamp: string | null;
  created_at: string;
  media_url?: string | null;
  media_type?: string | null;
  attachment_name?: string | null;
  profiles?: {
    full_name: string;
  };
}

interface CreateConversationData {
  workspace_id: string;
  phone_number: string;
  contact_name?: string;
  lead_id?: string;
}

interface CreateMessageData {
  conversation_id: string;
  message_text: string;
  message_type: string;
  is_from_lead: boolean;
  sent_by?: string | null;
}

interface CreateTemplateData {
  workspace_id: string;
  name: string;
  content: string;
  category: string;
  created_by: string;
}

interface WhatsAppTemplate {
  id: string;
  workspace_id: string;
  name: string;
  content: string;
  category: string;
  created_by: string;
  created_at: string;
}

export function useWhatsAppConversations() {
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ['whatsapp-conversations', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      
      console.log('Fetching WhatsApp conversations for workspace:', currentWorkspace.id);
      
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          leads (
            name,
            email
          )
        `)
        .eq('workspace_id', currentWorkspace.id)
        .order('last_message_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching conversations:', error);
        throw error;
      }
      
      console.log('WhatsApp conversations fetched:', data?.length || 0);
      return data as WhatsAppConversation[];
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: false, // Desabilitar polling automático
    refetchOnWindowFocus: false, // Não atualizar no foco
    refetchIntervalInBackground: false, // Não atualizar em background
  });
}

export function useWhatsAppMessages(conversationId: string) {
  return useQuery({
    queryKey: ['whatsapp-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      console.log('Fetching messages for conversation:', conversationId);
      
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select(`
          *,
          profiles (
            full_name
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }
      
      console.log('Messages fetched for conversation:', data?.length || 0);
      return data as WhatsAppMessage[];
    },
    enabled: !!conversationId,
    refetchInterval: false, // Desabilitar polling automático
    refetchIntervalInBackground: false, // Não atualizar em background
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  
  return useMutation({
    mutationFn: async (conversationData: CreateConversationData) => {
      console.log('Creating conversation with data:', conversationData);
      
      // Garantir que o workspace_id está presente
      if (!conversationData.workspace_id && currentWorkspace?.id) {
        conversationData.workspace_id = currentWorkspace.id;
      }
      
      if (!conversationData.workspace_id) {
        throw new Error('Workspace ID é obrigatório');
      }
      
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .insert(conversationData)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating conversation:', error);
        throw error;
      }
      
      console.log('Conversation created successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      toast.success('Conversa criada com sucesso!');
    },
    onError: (error) => {
      console.error('Create conversation error:', error);
      toast.error('Erro ao criar conversa: ' + error.message);
    },
  });
}

export function useWhatsAppTemplates(workspaceId?: string) {
  return useQuery({
    queryKey: ['whatsapp-templates', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      console.log('Fetching WhatsApp templates for workspace:', workspaceId);
      
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching templates:', error);
        throw error;
      }
      
      console.log('WhatsApp templates fetched:', data?.length || 0);
      return data as WhatsAppTemplate[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (templateData: CreateTemplateData) => {
      console.log('Creating template with data:', templateData);
      
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .insert(templateData)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating template:', error);
        throw error;
      }
      
      console.log('Template created successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('Template criado com sucesso!');
    },
    onError: (error) => {
      console.error('Create template error:', error);
      toast.error('Erro ao criar template: ' + error.message);
    },
  });
}

export function useCreateMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (messageData: CreateMessageData) => {
      console.log('Creating message with data:', messageData);
      
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .insert(messageData)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating message:', error);
        throw error;
      }
      
      console.log('Message created successfully:', data);
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      
      // Atualizar o timestamp da última mensagem na conversa
      if (data.conversation_id) {
        // Primeiro, obter o número atual de mensagens
        const { data: currentConvo, error: fetchError } = await supabase
          .from('whatsapp_conversations')
          .select('message_count')
          .eq('id', data.conversation_id)
          .single();
        
        if (!fetchError && currentConvo) {
          const newCount = (currentConvo.message_count || 0) + 1;
          
          await supabase
            .from('whatsapp_conversations')
            .update({ 
              last_message_at: new Date().toISOString(),
              message_count: newCount
            })
            .eq('id', data.conversation_id);
        }
      }
    },
    onError: (error) => {
      console.error('Create message error:', error);
      toast.error('Erro ao enviar mensagem: ' + error.message);
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ conversationId }: { conversationId: string }) => {
      console.log('Deleting conversation:', conversationId);
      
      // Primeiro, deletar todas as mensagens da conversa
      const { error: messagesError } = await supabase
        .from('whatsapp_messages')
        .delete()
        .eq('conversation_id', conversationId);
      
      if (messagesError) {
        console.error('Error deleting messages:', messagesError);
        throw messagesError;
      }
      
      // Depois, deletar a conversa
      const { error: conversationError } = await supabase
        .from('whatsapp_conversations')
        .delete()
        .eq('id', conversationId);
      
      if (conversationError) {
        console.error('Error deleting conversation:', conversationError);
        throw conversationError;
      }
      
      console.log('Conversation deleted successfully');
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      toast.success('Conversa apagada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Delete conversation error:', error);
      toast.error('Erro ao apagar conversa: ' + error.message);
    },
  });
}

export function useDeleteAllConversations() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  
  return useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) {
        throw new Error('Workspace não encontrado');
      }
      
      console.log('Deleting all conversations for workspace:', currentWorkspace.id);
      
      // Primeiro, buscar os IDs das conversas do workspace
      const { data: conversations, error: fetchError } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('workspace_id', currentWorkspace.id);
      
      if (fetchError) {
        console.error('Error fetching conversations:', fetchError);
        throw fetchError;
      }
      
      if (!conversations || conversations.length === 0) {
        console.log('No conversations to delete');
        return { success: true };
      }
      
      const conversationIds = conversations.map(conv => conv.id);
      
      // Deletar todas as mensagens dessas conversas
      const { error: messagesError } = await supabase
        .from('whatsapp_messages')
        .delete()
        .in('conversation_id', conversationIds);
      
      if (messagesError) {
        console.error('Error deleting messages:', messagesError);
        throw messagesError;
      }
      
      // Depois, deletar todas as conversas
      const { error: conversationsError } = await supabase
        .from('whatsapp_conversations')
        .delete()
        .eq('workspace_id', currentWorkspace.id);
      
      if (conversationsError) {
        console.error('Error deleting conversations:', conversationsError);
        throw conversationsError;
      }
      
      console.log('All conversations deleted successfully');
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      toast.success('Todas as conversas foram apagadas com sucesso!');
    },
    onError: (error: any) => {
      console.error('Delete all conversations error:', error);
      toast.error('Erro ao apagar conversas: ' + error.message);
    },
  });
}
