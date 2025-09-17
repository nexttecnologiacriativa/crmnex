import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useN8nAutoProcessor() {
  const [processingCount, setProcessingCount] = useState(0);

  useEffect(() => {
    let isProcessing = false;
    let channel: any = null;

    const processQueue = async () => {
      if (isProcessing) return;
      
      isProcessing = true;
      setProcessingCount(prev => prev + 1);
      
      try {
        const { data, error } = await supabase.functions.invoke('n8n-automation-processor');
        
        if (error) {
          console.error('Error processing n8n queue:', error);
          toast.error('Erro ao processar n8n automaticamente');
        } else {
        console.log('✅ N8n queue processed automatically:', data);
        toast.success('Lead enviado automaticamente para n8n!', {
          description: 'Integração funcionando perfeitamente'
        });
        }
      } catch (error) {
        console.error('Exception processing n8n queue:', error);
      } finally {
        isProcessing = false;
        setProcessingCount(prev => prev - 1);
      }
    };

  // Configurar realtime para monitorar novos itens na fila
    channel = supabase
      .channel(`automation-queue-monitor-${Date.now()}`) // Nome único para evitar conflitos
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'automation_queue',
          filter: 'trigger_type=in.(n8n_lead_notification,pipeline_stage_changed)'
        },
        async (payload) => {
          console.log('🔔 New automation item in queue:', payload);
          
          // Pequeno delay para garantir que o item foi inserido completamente
          setTimeout(() => {
            processQueue();
          }, 1000);
        }
      );

    // Subscrever apenas uma vez
    channel.subscribe((status: string) => {
      console.log('🎧 Automation auto-processor subscription status:', status);
    });

    return () => {
      console.log('🔇 Stopping automation auto-processor...');
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return { processingCount };
}