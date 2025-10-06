import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';
import { toast } from 'sonner';

interface AutomationFlow {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: any;
  steps: any;
  is_active: boolean | null;
  send_once_per_lead: boolean | null;
  execution_count: number | null;
  success_rate: number | null;
  created_at: string | null;
  updated_at: string | null;
  workspace_id: string;
}

export function useAutomationFlows() {
  const [flows, setFlows] = useState<AutomationFlow[]>([]);
  const [loading, setLoading] = useState(false);
  const { currentWorkspace } = useWorkspace();

  const fetchFlows = async () => {
    if (!currentWorkspace?.id) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('automation_flows')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching automation flows:', error);
        setFlows([]);
      } else {
        setFlows((data || []) as AutomationFlow[]);
      }
    } catch (error) {
      console.error('Error fetching automation flows:', error);
      setFlows([]);
    } finally {
      setLoading(false);
    }
  };

  const createFlow = async (flowData: Partial<AutomationFlow>) => {
    if (!currentWorkspace?.id) throw new Error('No workspace selected');

    try {
      setLoading(true);
      
      // Criar na tabela automation_flows
      const insertData = {
        name: flowData.name || 'Novo Fluxo',
        description: flowData.description || '',
        trigger_type: flowData.trigger_type || 'tag_applied',
        trigger_config: flowData.trigger_config || {},
        steps: flowData.steps || [],
        is_active: flowData.is_active ?? true,
        send_once_per_lead: flowData.send_once_per_lead ?? true,
        workspace_id: currentWorkspace.id
      };

      const { data, error } = await supabase
        .from('automation_flows')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating flow:', error);
        throw error;
      }

      if (data) {
        await fetchFlows(); // Recarregar fluxos
        toast.success('Fluxo criado com sucesso!');
        return data;
      }
    } catch (error) {
      console.error('Error creating flow:', error);
      toast.error('Erro ao criar fluxo');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateFlow = async (flowId: string, flowData: Partial<AutomationFlow>) => {
    if (!currentWorkspace?.id) throw new Error('No workspace selected');

    try {
      setLoading(true);
      
      const updateData: any = {
        name: flowData.name,
        description: flowData.description,
        steps: flowData.steps,
        is_active: flowData.is_active,
        send_once_per_lead: flowData.send_once_per_lead,
        updated_at: new Date().toISOString()
      };

      if (flowData.trigger_config !== undefined) {
        updateData.trigger_config = flowData.trigger_config;
      }

      const { data, error } = await supabase
        .from('automation_flows')
        .update(updateData)
        .eq('id', flowId)
        .eq('workspace_id', currentWorkspace.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating flow:', error);
        throw error;
      }

      if (data) {
        // Recarregar fluxos e aguardar completar
        await fetchFlows();
        toast.success('Fluxo atualizado com sucesso!');
        return data;
      }
    } catch (error) {
      console.error('Error updating flow:', error);
      toast.error('Erro ao atualizar fluxo');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const toggleFlow = async (flowId: string) => {
    try {
      const flow = flows.find(f => f.id === flowId);
      if (!flow) return;

      const { error } = await supabase
        .from('automation_flows')
        .update({ is_active: !flow.is_active })
        .eq('id', flowId);

      if (error) {
        console.error('Error toggling flow:', error);
        toast.error('Erro ao alterar status do fluxo');
        return;
      }

      setFlows(prev => prev.map(f => 
        f.id === flowId ? { ...f, is_active: !f.is_active } : f
      ));

      toast.success(`Fluxo ${!flow.is_active ? 'ativado' : 'desativado'} com sucesso`);
    } catch (error) {
      console.error('Error toggling flow:', error);
      toast.error('Erro ao alterar status do fluxo');
    }
  };

  const deleteFlow = async (flowId: string) => {
    try {
      const { error } = await supabase
        .from('automation_flows')
        .delete()
        .eq('id', flowId);

      if (error) {
        console.error('Error deleting flow:', error);
        toast.error('Erro ao excluir fluxo');
        return;
      }

      setFlows(prev => prev.filter(f => f.id !== flowId));
      toast.success('Fluxo excluído com sucesso');
    } catch (error) {
      console.error('Error deleting flow:', error);
      toast.error('Erro ao excluir fluxo');
    }
  };

  useEffect(() => {
    fetchFlows();
  }, [currentWorkspace?.id]);

  return {
    flows,
    loading,
    createFlow,
    updateFlow,
    toggleFlow,
    deleteFlow,
    refreshFlows: fetchFlows
  };
}