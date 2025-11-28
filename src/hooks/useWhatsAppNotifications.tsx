import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useNotificationSound } from './useNotificationSound';

export function useWhatsAppNotifications() {
  const { currentWorkspace } = useWorkspace();
  const { playSound } = useNotificationSound();
  const [lastUnreadCount, setLastUnreadCount] = useState(0);
  const [showNotification, setShowNotification] = useState(false);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-conversations-count', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return 0;
      const { count, error } = await supabase
        .from('whatsapp_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_read', false);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: false, // Disable polling to stop auto-refresh
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false
  });

  // Adicionar listener em tempo real para novas mensagens
  useEffect(() => {
    if (!currentWorkspace?.id) return;

    console.log('Setting up WhatsApp message realtime listener for workspace:', currentWorkspace.id);

    const channel = supabase
      .channel(`whatsapp_messages_${currentWorkspace.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
        },
        (payload) => {
          console.log('New WhatsApp message received:', payload);
          console.log('is_from_lead:', (payload.new as any)?.is_from_lead);
          
          // Só toca som se a mensagem for recebida (não enviada pelo usuário)
          if (payload.new && (payload.new as any).is_from_lead === true) {
            console.log('Playing WhatsApp notification sound...');
            playSound('whatsapp');
          }
        }
      )
      .subscribe((status) => {
        console.log('WhatsApp message realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up WhatsApp message realtime listener');
      supabase.removeChannel(channel);
    };
  }, [currentWorkspace?.id, playSound]);

  useEffect(() => {
    // Se há novas mensagens não lidas, mostrar notificação
    if (unreadCount > lastUnreadCount && lastUnreadCount > 0) {
      setShowNotification(true);
    }
    setLastUnreadCount(unreadCount);
  }, [unreadCount, lastUnreadCount]);

  const hideNotification = () => {
    setShowNotification(false);
  };

  return {
    unreadCount,
    showNotification,
    hideNotification
  };
}