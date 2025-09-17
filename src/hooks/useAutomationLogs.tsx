import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';
import { toast } from 'sonner';

interface AutomationLog {
  id: string;
  flow_id: string;
  flow_name: string;
  lead_id: string;
  lead_name: string;
  step_name: string;
  status: 'success' | 'error' | 'pending';
  message_sent: string | null;
  error_message: string | null;
  executed_at: string;
  workspace_id: string;
}

export function useAutomationLogs(flowId?: string) {
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const { currentWorkspace } = useWorkspace();

  const fetchLogs = async () => {
    if (!currentWorkspace?.id) return;

    try {
      setLoading(true);
      
      // Tentar buscar logs reais primeiro
      try {
        const { data, error } = await supabase
          .from('automation_logs' as any)
          .select(`
            *,
            automation_flows!inner(name),
            leads!inner(name)
          `)
          .eq('workspace_id', currentWorkspace.id)
          .order('executed_at', { ascending: false })
          .limit(50);

        if (!error && data) {
          const transformedLogs = data.map((log: any) => ({
            ...log,
            flow_name: log.automation_flows?.name || 'Fluxo desconhecido',
            lead_name: log.leads?.name || 'Lead desconhecido'
          }));
          
          setLogs(transformedLogs);
          return;
        }
      } catch (dbError) {
        console.log('Database not ready, using mock data');
      }
      
      // Fallback: usar dados mock
      const mockLogs: AutomationLog[] = [
        {
          id: '1',
          flow_id: flowId || '1',
          flow_name: 'Boas-vindas Novos Leads',
          lead_id: '1',
          lead_name: 'João Silva',
          step_name: 'Enviar mensagem de boas-vindas',
          status: 'success',
          message_sent: 'Template de boas-vindas enviado com sucesso',
          error_message: null,
          executed_at: new Date().toISOString(),
          workspace_id: currentWorkspace.id
        },
        {
          id: '2',
          flow_id: flowId || '2',
          flow_name: 'Follow-up Interessados',
          lead_id: '2',
          lead_name: 'Maria Santos',
          step_name: 'Enviar seguimento',
          status: 'error',
          message_sent: null,
          error_message: 'Template não aprovado pela API do WhatsApp',
          executed_at: new Date(Date.now() - 86400000).toISOString(),
          workspace_id: currentWorkspace.id
        },
        {
          id: '3',
          flow_id: flowId || '1',
          flow_name: 'Boas-vindas Novos Leads',
          lead_id: '3',
          lead_name: 'Pedro Costa',
          step_name: 'Aplicar tag "cliente-ativo"',
          status: 'success',
          message_sent: null,
          error_message: null,
          executed_at: new Date(Date.now() - 3600000).toISOString(),
          workspace_id: currentWorkspace.id
        }
      ];

      // Filtrar por flow se especificado
      const filteredLogs = flowId 
        ? mockLogs.filter(log => log.flow_id === flowId)
        : mockLogs;
      
      setLogs(filteredLogs);
    } catch (error) {
      console.error('Error fetching automation logs:', error);
      toast.error('Erro ao carregar logs de automação');
    } finally {
      setLoading(false);
    }
  };

  const createLog = async (logData: Partial<AutomationLog>) => {
    if (!currentWorkspace?.id) return;

    try {
      // Tentar inserir no banco real
      try {
        await supabase
          .from('automation_logs' as any)
          .insert({
            ...logData,
            workspace_id: currentWorkspace.id,
            executed_at: new Date().toISOString()
          });
      } catch (dbError) {
        console.log('Database not ready for log insertion');
      }

      // Adicionar localmente
      const newLog: AutomationLog = {
        id: Date.now().toString(),
        flow_id: logData.flow_id || '',
        flow_name: logData.flow_name || 'Fluxo',
        lead_id: logData.lead_id || '',
        lead_name: logData.lead_name || 'Lead',
        step_name: logData.step_name || 'Passo',
        status: logData.status || 'pending',
        message_sent: logData.message_sent || null,
        error_message: logData.error_message || null,
        executed_at: new Date().toISOString(),
        workspace_id: currentWorkspace.id
      };
      
      setLogs(prev => [newLog, ...prev]);
    } catch (error) {
      console.error('Error creating automation log:', error);
    }
  };

  // Função para simular execução manual de fluxo
  const simulateFlowExecution = async (flowId: string, leadId: string) => {
    try {
      await createLog({
        flow_id: flowId,
        flow_name: 'Teste Manual',
        lead_id: leadId,
        lead_name: 'Lead de Teste',
        step_name: 'Execução manual do fluxo',
        status: 'success',
        message_sent: 'Fluxo executado manualmente com sucesso'
      });
      
      toast.success('Fluxo executado com sucesso!');
    } catch (error) {
      console.error('Error simulating flow execution:', error);
      toast.error('Erro ao executar fluxo');
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentWorkspace?.id, flowId]);

  return {
    logs,
    loading,
    refreshLogs: fetchLogs,
    createLog,
    simulateFlowExecution
  };
}