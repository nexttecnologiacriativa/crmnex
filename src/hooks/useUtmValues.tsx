
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspaces } from '@/hooks/useWorkspace';

export function useUtmValues() {
  const { data: workspaces } = useWorkspaces();
  const currentWorkspace = workspaces?.[0];

  const { data: utmSources = [] } = useQuery({
    queryKey: ['utm-sources', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      
      const { data, error } = await supabase
        .from('leads')
        .select('utm_source')
        .eq('workspace_id', currentWorkspace.id)
        .not('utm_source', 'is', null);
      
      if (error) throw error;
      
      const uniqueSources = [...new Set(data.map(item => item.utm_source).filter(Boolean))];
      return uniqueSources;
    },
    enabled: !!currentWorkspace,
  });

  const { data: utmMediums = [] } = useQuery({
    queryKey: ['utm-mediums', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      
      const { data, error } = await supabase
        .from('leads')
        .select('utm_medium')
        .eq('workspace_id', currentWorkspace.id)
        .not('utm_medium', 'is', null);
      
      if (error) throw error;
      
      const uniqueMediums = [...new Set(data.map(item => item.utm_medium).filter(Boolean))];
      return uniqueMediums;
    },
    enabled: !!currentWorkspace,
  });

  const { data: utmCampaigns = [] } = useQuery({
    queryKey: ['utm-campaigns', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      
      const { data, error } = await supabase
        .from('leads')
        .select('utm_campaign')
        .eq('workspace_id', currentWorkspace.id)
        .not('utm_campaign', 'is', null);
      
      if (error) throw error;
      
      const uniqueCampaigns = [...new Set(data.map(item => item.utm_campaign).filter(Boolean))];
      return uniqueCampaigns;
    },
    enabled: !!currentWorkspace,
  });

  return {
    utmSources,
    utmMediums,
    utmCampaigns,
  };
}
