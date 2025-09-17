import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, MessageCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WhatsAppNotificationPopupProps {
  onClose: () => void;
  onGoToWhatsApp: () => void;
}

export default function WhatsAppNotificationPopup({ onClose, onGoToWhatsApp }: WhatsAppNotificationPopupProps) {
  const { currentWorkspace } = useWorkspace();
  
  const { data: unreadConversations = [] } = useQuery({
    queryKey: ['unread-conversations', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select(`
          id,
          phone_number,
          contact_name,
          last_message_at,
          is_read,
          message_count,
          leads (
            name,
            email
          )
        `)
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_read', false)
        .order('last_message_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: 3000
  });

  return (
    <div className="fixed top-4 right-4 z-50 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 animate-fade-in">
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <h3 className="font-semibold">Nova mensagem no WhatsApp</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20 h-6 w-6 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="p-4">
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {unreadConversations.slice(0, 3).map((conv) => (
            <div key={conv.id} className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {conv.contact_name || conv.leads?.name || conv.phone_number}
                </p>
                <p className="text-sm text-gray-600">
                  {format(new Date(conv.last_message_at), 'HH:mm', { locale: ptBR })}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 flex gap-2">
          <Button
            onClick={onGoToWhatsApp}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            Ver Conversas
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="px-3"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}