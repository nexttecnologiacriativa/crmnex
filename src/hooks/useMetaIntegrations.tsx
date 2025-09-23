import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';

export interface MetaIntegration {
  id: string;
  workspace_id: string;
  name: string;
  meta_app_id: string;
  access_token: string;
  app_secret: string;
  webhook_verify_token: string;
  is_active: boolean;
  selected_pipeline_id: string;
  selected_tag_ids: string[];
  field_mapping: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface MetaLeadForm {
  id: string;
  integration_id: string;
  meta_form_id: string;
  form_name: string;
  page_id: string;
  page_name: string;
  fields_schema: any[];
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMetaIntegrationData {
  name: string;
  meta_app_id: string;
  app_secret: string;
  selected_pipeline_id: string;
  selected_tag_ids: string[];
}

export function useMetaIntegrations() {
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ['meta-integrations', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      
      const { data, error } = await supabase
        .from('meta_integrations')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as MetaIntegration[];
    },
    enabled: !!currentWorkspace?.id
  });
}

export function useMetaLeadForms(integrationId?: string) {
  return useQuery({
    queryKey: ['meta-lead-forms', integrationId],
    queryFn: async () => {
      if (!integrationId) return [];
      
      const { data, error } = await supabase
        .from('meta_lead_forms')
        .select('*')
        .eq('integration_id', integrationId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as MetaLeadForm[];
    },
    enabled: !!integrationId
  });
}

export function useCreateMetaIntegration() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (data: CreateMetaIntegrationData) => {
      if (!currentWorkspace?.id) throw new Error('No workspace selected');

      const integrationId = crypto.randomUUID();
      
      // Initiate OAuth flow
      const { data: oauthData, error } = await supabase.functions.invoke('meta-oauth-handler', {
        body: {
          action: 'initiate',
          workspaceId: currentWorkspace.id,
          integrationId,
          name: data.name,
          appId: data.meta_app_id,
          appSecret: data.app_secret,
          selectedPipelineId: data.selected_pipeline_id,
          selectedTagIds: data.selected_tag_ids
        }
      });

      if (error) throw error;
      
      return {
        integration_id: integrationId,
        oauth_url: oauthData.oauth_url,
        state: oauthData.state
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-integrations'] });
    }
  });
}

export function useUpdateMetaIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<MetaIntegration> & { id: string }) => {
      const { error } = await supabase
        .from('meta_integrations')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-integrations'] });
    }
  });
}

export function useDeleteMetaIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('meta_integrations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-integrations'] });
    }
  });
}

export function useSyncMetaForms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (integrationId: string) => {
      const { data, error } = await supabase.functions.invoke('meta-forms-manager', {
        body: {
          action: 'sync_forms',
          integration_id: integrationId
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, integrationId) => {
      queryClient.invalidateQueries({ queryKey: ['meta-lead-forms', integrationId] });
    }
  });
}