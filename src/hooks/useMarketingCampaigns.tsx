import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';
import { toast } from '@/hooks/use-toast';

export interface MarketingCampaign {
  id: string;
  workspace_id: string;
  name: string;
  template_id?: string;
  template_name?: string;
  message_preview?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  segments?: any;
  leads_count?: number;
  scheduled_at?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
  // Novos campos
  api_type: 'whatsapp_official' | 'evolution';
  message_interval_minutes?: number;
  custom_numbers?: string[];
  recipient_type: 'leads' | 'custom_numbers' | 'csv_upload';
  multiple_templates?: CampaignTemplate[];
  recipients_count?: number;
  sent_count?: number;
  delivered_count?: number;
  read_count?: number;
  failed_count?: number;
}

export interface CampaignTemplate {
  id: string;
  name: string;
  preview: string;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  phone_number: string;
  lead_id?: string;
  template_used?: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  failed_at?: string;
  error_message?: string;
}

export interface CreateCampaignData {
  name: string;
  template_id?: string;
  template_name?: string;
  message_preview?: string;
  segments?: any;
  scheduled_at?: string;
  start_immediately?: boolean;
  // Novos campos
  api_type: 'whatsapp_official' | 'evolution';
  message_interval_minutes?: number;
  custom_numbers?: string[];
  recipient_type: 'leads' | 'custom_numbers' | 'csv_upload';
  multiple_templates?: CampaignTemplate[];
  evolution_instance?: string;
}

export function useMarketingCampaigns(filter?: string) {
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ['marketing-campaigns', currentWorkspace?.id, filter],
    queryFn: async (): Promise<MarketingCampaign[]> => {
      if (!currentWorkspace?.id) return [];

      let query = supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (filter && filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data: campaigns, error } = await query;
      
      if (error) {
        console.error('Error fetching campaigns:', error);
        throw new Error('Failed to fetch campaigns');
      }

      if (!campaigns) return [];

      // Buscar estatísticas dos recipients para cada campanha
      const campaignsWithStats = await Promise.all(
        campaigns.map(async (campaign) => {
          const { data: recipients } = await supabase
            .from('marketing_campaign_recipients')
            .select('status, sent_at, delivered_at, read_at, failed_at')
            .eq('campaign_id', campaign.id);

          const recipientsCount = recipients?.length || 0;
          const sentCount = recipients?.filter(r => r.sent_at).length || 0;
          const deliveredCount = recipients?.filter(r => r.delivered_at).length || 0;
          const readCount = recipients?.filter(r => r.read_at).length || 0;
          const failedCount = recipients?.filter(r => r.status === 'failed').length || 0;

          return {
            ...campaign,
            recipients_count: recipientsCount,
            sent_count: sentCount,
            delivered_count: deliveredCount,
            read_count: readCount,
            failed_count: failedCount,
            multiple_templates: campaign.multiple_templates ? 
              (typeof campaign.multiple_templates === 'string' ? 
                JSON.parse(campaign.multiple_templates) : 
                campaign.multiple_templates) : []
          } as MarketingCampaign;
        })
      );

      return campaignsWithStats;
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: 10000,
  });
}

export function useCreateMarketingCampaign() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  
  return useMutation({
    mutationFn: async (data: CreateCampaignData) => {
      if (!currentWorkspace?.id) {
        throw new Error('No workspace selected');
      }

      const workspaceId = currentWorkspace.id;

      // Criar a campanha primeiro
      const campaignData = {
        name: data.name,
        template_id: data.template_id,
        template_name: data.template_name,
        message_preview: data.message_preview,
        segments: {
          ...data.segments,
          evolution_instance: data.evolution_instance // Adicionar instância nos segments
        },
        scheduled_at: data.scheduled_at,
        status: data.start_immediately ? 'sending' : 'scheduled',
        workspace_id: workspaceId,
        // Novos campos
        api_type: data.api_type,
        message_interval_minutes: data.message_interval_minutes,
        custom_numbers: JSON.stringify(data.custom_numbers || []),
        recipient_type: data.recipient_type,
        multiple_templates: JSON.stringify(data.multiple_templates || [])
      };

      const { data: campaign, error: campaignError } = await supabase
        .from('marketing_campaigns')
        .insert(campaignData)
        .select()
        .single();

      if (campaignError) {
        console.error('Error creating campaign:', campaignError);
        throw new Error('Failed to create campaign');
      }

      // Criar recipients baseado no tipo de destinatário
      let recipients: any[] = [];

      if (data.recipient_type === 'leads') {
        // Buscar leads baseado na segmentação
        let leadsQuery = supabase
          .from('leads')
          .select('id, phone, name')
          .eq('workspace_id', workspaceId);

        if (data.segments?.tags && data.segments.tags.length > 0) {
          const { data: tagRelations } = await supabase
            .from('lead_tag_relations')
            .select('lead_id')
            .in('tag_id', data.segments.tags);
          
          if (tagRelations) {
            const leadIds = tagRelations.map(tr => tr.lead_id);
            leadsQuery = leadsQuery.in('id', leadIds);
          }
        }

        if (data.segments?.pipeline_id) {
          leadsQuery = leadsQuery.eq('pipeline_id', data.segments.pipeline_id);
        }

        if (data.segments?.stage_id) {
          leadsQuery = leadsQuery.eq('stage_id', data.segments.stage_id);
        }

        const { data: leads, error: leadsError } = await leadsQuery;
        
        if (leadsError) {
          console.error('Error fetching leads:', leadsError);
          throw new Error('Failed to fetch leads for campaign');
        }

        recipients = leads?.map(lead => ({
          campaign_id: campaign.id,
          phone_number: lead.phone,
          lead_id: lead.id,
          status: 'pending'
        })) || [];
      } else if (data.recipient_type === 'custom_numbers') {
        // Criar recipients para números personalizados
        recipients = (data.custom_numbers || []).map(phone => ({
          campaign_id: campaign.id,
          phone_number: phone,
          lead_id: null,
          status: 'pending'
        }));
      }

      if (recipients.length > 0) {
        const { error: recipientsError } = await supabase
          .from('marketing_campaign_recipients')
          .insert(recipients);

        if (recipientsError) {
          console.error('Error creating recipients:', recipientsError);
          throw new Error('Failed to create campaign recipients');
        }
      }

      // Atualizar contador de leads na campanha
      await supabase
        .from('marketing_campaigns')
        .update({ leads_count: recipients.length })
        .eq('id', campaign.id);

      // Se for para enviar imediatamente, enfileirar na automação
      if (data.start_immediately) {
        const { error: queueError } = await supabase
          .from('automation_queue')
          .insert({
            workspace_id: workspaceId,
            trigger_type: 'marketing_campaign_send',
            trigger_data: {
              campaign_id: campaign.id,
              api_type: data.api_type
            }
          });
        if (queueError) throw queueError;
        
        // Atualiza status para feedback
        await supabase
          .from('marketing_campaigns')
          .update({ status: 'sending' })
          .eq('id', campaign.id);

        // Dispara o processor imediatamente
        await supabase.functions.invoke('automation-processor', { body: {} });

        // Fallback: invocar diretamente o engine caso a fila não seja processada
        await supabase.functions.invoke('automation-engine', {
          body: {
            action: 'process_marketing_campaign',
            campaign_id: campaign.id,
            api_type: data.api_type,
            workspace_id: workspaceId,
          }
        });
      }

      return campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      toast({
        title: "Campanha criada com sucesso!",
        description: "A campanha foi criada e está sendo processada.",
      });
    },
    onError: (error: any) => {
      console.error('Create campaign error:', error);
      toast({
        title: "Erro ao criar campanha",
        description: error.message || 'Erro desconhecido',
        variant: "destructive",
      });
    },
  });
}

export function useStartCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (campaignId: string) => {
      // Buscar a campanha com workspace_id
      const { data: campaign, error: campaignError } = await supabase
        .from('marketing_campaigns')
        .select('api_type, workspace_id')
        .eq('id', campaignId)
        .single();

      if (campaignError || !campaign) {
        throw new Error('Campaign not found');
      }

      // Inserir campanha na fila de automação para processamento
      const { error: queueError } = await supabase
        .from('automation_queue')
        .insert({
          workspace_id: campaign.workspace_id,
          trigger_type: 'marketing_campaign_send',
          trigger_data: {
            campaign_id: campaignId,
            api_type: campaign.api_type
          }
        });

      if (queueError) throw queueError;

      // Atualiza status imediatamente para feedback na UI
      await supabase
        .from('marketing_campaigns')
        .update({ status: 'sending' })
        .eq('id', campaignId);

      // Dispara o processor imediatamente
      await supabase.functions.invoke('automation-processor', { body: {} });

      // Fallback: invocar diretamente o engine caso a fila não seja processada
      await supabase.functions.invoke('automation-engine', {
        body: {
          action: 'process_marketing_campaign',
          campaign_id: campaignId,
          api_type: campaign.api_type,
          workspace_id: campaign.workspace_id,
        }
      });
      
      return { success: true, message: 'Campaign queued for processing' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      toast({
        title: "Campanha iniciada!",
        description: "A campanha está sendo enviada.",
      });
    },
    onError: (error: any) => {
      console.error('Start campaign error:', error);
      toast({
        title: "Erro ao iniciar campanha",
        description: error.message || 'Erro desconhecido',
        variant: "destructive",
      });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (campaignId: string) => {
      // Os recipients são deletados automaticamente por CASCADE
      const { error: campaignError } = await supabase
        .from('marketing_campaigns')
        .delete()
        .eq('id', campaignId);

      if (campaignError) throw campaignError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      toast({
        title: "Campanha excluída!",
        description: "A campanha foi removida com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error('Delete campaign error:', error);
      toast({
        title: "Erro ao excluir campanha",
        description: error.message || 'Erro desconhecido',
        variant: "destructive",
      });
    },
  });
}

export function useCampaignAnalytics() {
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ['campaign-analytics', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;

      const { data: campaigns } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('workspace_id', currentWorkspace.id);

      if (!campaigns) return null;

      // Buscar estatísticas dos recipients
      const campaignDetails = await Promise.all(
        campaigns.map(async (campaign) => {
          const { data: recipients } = await supabase
            .from('marketing_campaign_recipients')
            .select('status, sent_at, delivered_at, read_at, failed_at')
            .eq('campaign_id', campaign.id);

          const total = recipients?.length || 0;
          const sent = recipients?.filter(r => r.sent_at).length || 0;
          const delivered = recipients?.filter(r => r.delivered_at).length || 0;
          const read = recipients?.filter(r => r.read_at).length || 0;
          const failed = recipients?.filter(r => r.status === 'failed').length || 0;
          
          return {
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            api_type: campaign.api_type,
            total,
            sent,
            delivered,
            read,
            failed,
            deliveryRate: sent > 0 ? ((delivered / sent) * 100).toFixed(1) : '0',
            readRate: delivered > 0 ? ((read / delivered) * 100).toFixed(1) : '0',
            failureRate: total > 0 ? ((failed / total) * 100).toFixed(1) : '0',
            createdAt: campaign.created_at,
            sentAt: campaign.sent_at
          };
        })
      );

      const analytics = {
        totalCampaigns: campaigns.length,
        totalSent: campaignDetails.reduce((acc, c) => acc + c.sent, 0),
        totalDelivered: campaignDetails.reduce((acc, c) => acc + c.delivered, 0),
        totalRead: campaignDetails.reduce((acc, c) => acc + c.read, 0),
        totalFailed: campaignDetails.reduce((acc, c) => acc + c.failed, 0),
        activeCampaigns: campaigns.filter(c => c.status === 'sending').length,
        scheduledCampaigns: campaigns.filter(c => c.status === 'scheduled').length,
        completedCampaigns: campaigns.filter(c => c.status === 'sent').length,
        whatsappOfficialCampaigns: campaigns.filter(c => c.api_type === 'whatsapp_official').length,
        evolutionCampaigns: campaigns.filter(c => c.api_type === 'evolution').length,
        campaigns: campaignDetails
      };

      return analytics;
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: 30000,
  });
}