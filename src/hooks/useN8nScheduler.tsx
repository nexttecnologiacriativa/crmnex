import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useN8nScheduler = () => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const processN8nQueue = async () => {
    try {
      console.log('🚀 Executando scheduler N8N automático...');
      
      const { data, error } = await supabase.functions.invoke('n8n-scheduler', {
        method: 'POST'
      });

      if (error) {
        console.error('❌ Erro no scheduler N8N:', error);
        return;
      }

      if (data?.processed > 0) {
        console.log(`✅ Scheduler N8N processou ${data.processed} itens`);
      }
      
    } catch (error) {
      console.error('❌ Erro executando scheduler N8N:', error);
    }
  };

  useEffect(() => {
    // Desabilitado - agora usa cron jobs no banco de dados
    // Para evitar conflitos com os schedulers automáticos
    console.log('🔄 N8N scheduler hook desabilitado - usando cron jobs');
  }, []);

  return {
    processN8nQueue
  };
};