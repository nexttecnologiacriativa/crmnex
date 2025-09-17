import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';

export function useWhatsAppNotifications() {
  const { currentWorkspace } = useWorkspace();
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
    refetchInterval: 3000
  });

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