import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Play, RefreshCw, Zap } from 'lucide-react';
import { useN8nAutoProcessor } from '@/hooks/useN8nAutoProcessor';

export function N8nProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [queueCount, setQueueCount] = useState<number>(0);
  const { processingCount } = useN8nAutoProcessor();

  const checkQueue = async () => {
    try {
      const { data, error } = await supabase
        .from('automation_queue')
        .select('*', { count: 'exact' })
        .eq('trigger_type', 'n8n_lead_notification')
        .eq('status', 'pending');

      if (error) throw error;
      setQueueCount(data?.length || 0);
    } catch (error) {
      console.error('Error checking queue:', error);
      toast.error('Erro ao verificar fila');
    }
  };

  const processQueue = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('n8n-automation-processor');
      
      if (error) throw error;
      
      toast.success('Processador n8n executado com sucesso!');
      checkQueue(); // Atualizar contador
    } catch (error) {
      console.error('Error processing n8n queue:', error);
      toast.error('Erro ao processar fila do n8n');
    } finally {
      setIsProcessing(false);
    }
  };

  // Verificar fila ao montar o componente
  useEffect(() => {
    checkQueue();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-green-500" />
          Processador n8n - Automático
        </CardTitle>
        <CardDescription>
          {processingCount > 0 
            ? `Processando automaticamente (${processingCount} em andamento)...` 
            : "Monitora e processa automaticamente novos leads para n8n"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">
              Itens na fila: <span className="text-primary">{queueCount}</span>
              {processingCount > 0 && (
                <span className="ml-2 text-green-600 animate-pulse">
                  • Processando automaticamente
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {processingCount > 0 
                ? "Sistema processando automaticamente..." 
                : "Leads aguardando processamento para n8n"
              }
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkQueue}
            disabled={isProcessing}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">
              Processamento Automático Ativo
            </span>
          </div>
          <p className="text-xs text-green-600 mt-1">
            O sistema detecta automaticamente novos leads e os envia para o n8n em tempo real.
            Não é necessário processar manualmente.
          </p>
        </div>

        <Button
          onClick={processQueue}
          disabled={isProcessing || queueCount === 0 || processingCount > 0}
          className="w-full"
          variant="outline"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : processingCount > 0 ? (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Processamento Automático Ativo
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Processar Manualmente ({queueCount} itens)
            </>
          )}
        </Button>
        
        {queueCount === 0 && processingCount === 0 && (
          <p className="text-xs text-muted-foreground text-center">
            ✅ Nenhum item na fila - Sistema funcionando perfeitamente!
          </p>
        )}
      </CardContent>
    </Card>
  );
}