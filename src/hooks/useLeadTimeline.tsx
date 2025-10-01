import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

interface TimelineEvent {
  id: string;
  type: 'activity' | 'whatsapp';
  title: string;
  description: string;
  created_at: string;
  activity_type?: string;
  metadata?: any;
  user?: {
    full_name: string;
    avatar_url?: string;
  };
}

export function useLeadTimeline(leadId: string, enabled: boolean = true) {
  // Buscar dados em paralelo
  const { data, isLoading, error } = useQuery({
    queryKey: ['lead-timeline', leadId],
    queryFn: async () => {
      // Executar queries em paralelo
      const [activitiesResult, leadResult] = await Promise.all([
        // Buscar atividades com informações do usuário
        supabase
          .from('lead_activities')
          .select(`
            *,
            profiles:user_id (
              full_name,
              avatar_url
            )
          `)
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false }),
        
        // Buscar telefone do lead para WhatsApp
        supabase
          .from('leads')
          .select('phone')
          .eq('id', leadId)
          .maybeSingle()
      ]);

      if (activitiesResult.error) throw activitiesResult.error;
      if (leadResult.error) throw leadResult.error;

      const activities = activitiesResult.data || [];
      // leadResult.data pode ser null se o lead não existir
      const leadPhone = leadResult.data?.phone || null;

      // Se tiver telefone, buscar conversas do WhatsApp
      let whatsappConversations = [];
      if (leadPhone) {
        const { data: conversations, error: whatsappError } = await supabase
          .from('whatsapp_conversations')
          .select('*')
          .eq('phone_number', leadPhone)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!whatsappError && conversations) {
          whatsappConversations = conversations;
        }
      }

      return {
        activities,
        whatsappConversations,
      };
    },
    enabled: !!leadId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });

  // Processar e combinar eventos
  const timelineEvents = useMemo(() => {
    if (!data) return [];

    const events: TimelineEvent[] = [];

    // Adicionar atividades
    data.activities.forEach((activity: any) => {
      events.push({
        id: activity.id,
        type: 'activity',
        title: activity.title,
        description: activity.description || '',
        created_at: activity.created_at,
        activity_type: activity.activity_type,
        metadata: activity.metadata,
        user: activity.profiles ? {
          full_name: activity.profiles.full_name,
          avatar_url: activity.profiles.avatar_url,
        } : undefined,
      });
    });

    // Adicionar conversas do WhatsApp
    data.whatsappConversations.forEach((conversation: any) => {
      events.push({
        id: conversation.id,
        type: 'whatsapp',
        title: 'Conversa no WhatsApp',
        description: `${conversation.message_count} mensagens com ${conversation.contact_name || 'contato'}`,
        created_at: conversation.created_at,
        metadata: {
          phone_number: conversation.phone_number,
          message_count: conversation.message_count,
        },
      });
    });

    // Ordenar por data
    return events.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [data]);

  return {
    events: timelineEvents,
    isLoading,
    error,
  };
}
