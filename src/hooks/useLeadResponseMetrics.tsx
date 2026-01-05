import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { normalizeForMatch } from '@/lib/phone';

interface LeadResponseMetrics {
  avgFirstResponseTime: number | null; // em minutos
  avgWhatsAppResponseTime: number | null; // em minutos
  whatsAppPairsTotal: number;
  leadsWithoutResponse: number;
  leadsNeverContacted: number;
  leadsByIdleTime: {
    '1-3 dias': number;
    '4-7 dias': number;
    '7+ dias': number;
  };
  idleLeadsList: Array<{
    id: string;
    name: string;
    phone: string | null;
    daysIdle: number;
    lastInteraction: string | null;
    assignedTo: string | null;
  }>;
}

export function useLeadResponseMetrics() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['lead-response-metrics', currentWorkspace?.id],
    queryFn: async (): Promise<LeadResponseMetrics> => {
      if (!currentWorkspace?.id) {
        return getEmptyMetrics();
      }

      // Buscar métricas de resposta do WhatsApp via RPC (mais eficiente)
      const { data: whatsAppMetrics, error: rpcError } = await supabase.rpc(
        'get_whatsapp_response_metrics',
        { p_workspace_id: currentWorkspace.id, p_days_back: 30 }
      );

      let avgWhatsAppResponseTime: number | null = null;
      let whatsAppPairsTotal = 0;

      if (!rpcError && whatsAppMetrics && whatsAppMetrics.length > 0) {
        const result = whatsAppMetrics[0];
        avgWhatsAppResponseTime = result.avg_minutes ? Number(result.avg_minutes) : null;
        whatsAppPairsTotal = result.pairs_total || 0;
      }

      // Buscar leads com atividades
      const { data: leads } = await supabase
        .from('leads')
        .select(`
          id,
          name,
          phone,
          created_at,
          assigned_to,
          profiles:assigned_to (full_name)
        `)
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (!leads || leads.length === 0) {
        return {
          ...getEmptyMetrics(),
          avgWhatsAppResponseTime,
          whatsAppPairsTotal
        };
      }

      // Buscar atividades de todos os leads
      const leadIds = leads.map(l => l.id);
      const { data: activities } = await supabase
        .from('lead_activities')
        .select('lead_id, created_at, activity_type')
        .in('lead_id', leadIds)
        .order('created_at', { ascending: true });

      // Buscar conversas do WhatsApp - queries separadas para evitar .or() muito longo
      const phones = leads.map(l => l.phone).filter(Boolean) as string[];
      const normalizedPhones = phones.map(p => normalizeForMatch(p));
      
      // Query por lead_id
      const { data: convByLeadId } = await supabase
        .from('whatsapp_conversations')
        .select('id, lead_id, phone_number, created_at')
        .in('lead_id', leadIds);

      // Query por phone_number (números normalizados)
      let convByPhone: typeof convByLeadId = [];
      if (normalizedPhones.length > 0) {
        const { data } = await supabase
          .from('whatsapp_conversations')
          .select('id, lead_id, phone_number, created_at')
          .in('phone_number', normalizedPhones);
        convByPhone = data || [];
      }

      // Combinar e remover duplicatas
      const allConversations = [...(convByLeadId || []), ...(convByPhone || [])];
      const conversations = allConversations.filter((conv, index, self) => 
        index === self.findIndex(c => c.id === conv.id)
      );

      const conversationIds = conversations?.map(c => c.id) || [];
      
      // Buscar mensagens do WhatsApp - limitar para as últimas para performance
      let messages: any[] = [];
      if (conversationIds.length > 0) {
        // Buscar em batches se necessário
        const batchSize = 50;
        for (let i = 0; i < conversationIds.length; i += batchSize) {
          const batch = conversationIds.slice(i, i + batchSize);
          const { data: msgData } = await supabase
            .from('whatsapp_messages')
            .select('conversation_id, created_at, is_from_lead, timestamp')
            .in('conversation_id', batch)
            .order('created_at', { ascending: false })
            .limit(500);
          messages = [...messages, ...(msgData || [])];
        }
        // Ordenar cronologicamente
        messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }

      // Mapear conversas por lead usando normalização de telefone
      const conversationByLead = new Map<string, string>();
      conversations?.forEach(conv => {
        if (conv.lead_id) {
          conversationByLead.set(conv.lead_id, conv.id);
        } else if (conv.phone_number) {
          const normalizedConvPhone = normalizeForMatch(conv.phone_number);
          const lead = leads.find(l => l.phone && normalizeForMatch(l.phone) === normalizedConvPhone);
          if (lead) {
            conversationByLead.set(lead.id, conv.id);
          }
        }
      });

      // Calcular métricas por lead
      const now = new Date();
      let totalFirstResponseTime = 0;
      let firstResponseCount = 0;
      let leadsWithoutResponse = 0;
      let leadsNeverContacted = 0;
      const idleBuckets = { '1-3 dias': 0, '4-7 dias': 0, '7+ dias': 0 };
      const idleLeadsList: LeadResponseMetrics['idleLeadsList'] = [];

      for (const lead of leads) {
        const leadCreatedAt = new Date(lead.created_at);
        const leadActivities = activities?.filter(a => a.lead_id === lead.id) || [];
        const conversationId = conversationByLead.get(lead.id);
        const leadMessages = conversationId 
          ? messages.filter(m => m.conversation_id === conversationId)
          : [];

        // Primeira atividade ou mensagem enviada pela equipe
        const firstActivity = leadActivities[0];
        const firstTeamMessage = leadMessages.find(m => !m.is_from_lead);

        let firstContact: Date | null = null;
        if (firstActivity && firstTeamMessage) {
          const msgTime = new Date(firstTeamMessage.timestamp || firstTeamMessage.created_at).getTime();
          firstContact = new Date(Math.min(
            new Date(firstActivity.created_at).getTime(),
            msgTime
          ));
        } else if (firstActivity) {
          firstContact = new Date(firstActivity.created_at);
        } else if (firstTeamMessage) {
          firstContact = new Date(firstTeamMessage.timestamp || firstTeamMessage.created_at);
        }

        // Calcular tempo de primeiro atendimento
        if (firstContact) {
          const responseTime = (firstContact.getTime() - leadCreatedAt.getTime()) / (1000 * 60);
          if (responseTime > 0 && responseTime < 43200) { // máximo 30 dias
            totalFirstResponseTime += responseTime;
            firstResponseCount++;
          }
        } else {
          leadsNeverContacted++;
        }

        // Última interação
        const lastActivity = leadActivities[leadActivities.length - 1];
        const lastMessage = leadMessages[leadMessages.length - 1];
        
        let lastInteraction: Date | null = null;
        if (lastActivity && lastMessage) {
          const msgTime = new Date(lastMessage.timestamp || lastMessage.created_at).getTime();
          lastInteraction = new Date(Math.max(
            new Date(lastActivity.created_at).getTime(),
            msgTime
          ));
        } else if (lastActivity) {
          lastInteraction = new Date(lastActivity.created_at);
        } else if (lastMessage) {
          lastInteraction = new Date(lastMessage.timestamp || lastMessage.created_at);
        } else {
          lastInteraction = leadCreatedAt;
        }

        // Calcular dias parado
        const daysIdle = Math.floor((now.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24));

        if (daysIdle >= 1) {
          if (daysIdle <= 3) {
            idleBuckets['1-3 dias']++;
          } else if (daysIdle <= 7) {
            idleBuckets['4-7 dias']++;
          } else {
            idleBuckets['7+ dias']++;
          }

          if (daysIdle >= 3) {
            idleLeadsList.push({
              id: lead.id,
              name: lead.name,
              phone: lead.phone,
              daysIdle,
              lastInteraction: lastInteraction.toISOString(),
              assignedTo: (lead.profiles as any)?.full_name || null
            });
          }
        }

        // Leads aguardando resposta (tem mensagem do lead sem resposta)
        const lastLeadMessage = [...leadMessages].reverse().find(m => m.is_from_lead);
        const lastTeamMessage = [...leadMessages].reverse().find(m => !m.is_from_lead);
        if (lastLeadMessage) {
          const lastLeadMsgTime = new Date(lastLeadMessage.timestamp || lastLeadMessage.created_at);
          if (!lastTeamMessage) {
            leadsWithoutResponse++;
          } else {
            const lastTeamMsgTime = new Date(lastTeamMessage.timestamp || lastTeamMessage.created_at);
            if (lastLeadMsgTime > lastTeamMsgTime) {
              leadsWithoutResponse++;
            }
          }
        }
      }

      // Ordenar lista de leads parados por dias
      idleLeadsList.sort((a, b) => b.daysIdle - a.daysIdle);

      return {
        avgFirstResponseTime: firstResponseCount > 0 ? totalFirstResponseTime / firstResponseCount : null,
        avgWhatsAppResponseTime,
        whatsAppPairsTotal,
        leadsWithoutResponse,
        leadsNeverContacted,
        leadsByIdleTime: idleBuckets,
        idleLeadsList: idleLeadsList.slice(0, 50) // Limitar a 50 leads
      };
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000
  });
}

function getEmptyMetrics(): LeadResponseMetrics {
  return {
    avgFirstResponseTime: null,
    avgWhatsAppResponseTime: null,
    whatsAppPairsTotal: 0,
    leadsWithoutResponse: 0,
    leadsNeverContacted: 0,
    leadsByIdleTime: { '1-3 dias': 0, '4-7 dias': 0, '7+ dias': 0 },
    idleLeadsList: []
  };
}

export function formatResponseTime(minutes: number | null): string {
  if (minutes === null) return '-';
  
  if (minutes < 60) {
    return `${Math.round(minutes)}min`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  } else {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
}
