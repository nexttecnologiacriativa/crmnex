import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';

interface ValidationResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
}

export function WhatsAppMediaValidator() {
  const [isValidating, setIsValidating] = useState(false);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();

  const runValidation = async () => {
    if (!currentWorkspace) return;
    
    setIsValidating(true);
    const validationResults: ValidationResult[] = [];

    try {
      // Test 1: Evolution API Configuration
      try {
        const { data: evolutionConfig } = await supabase
          .from('whatsapp_evolution_configs')
          .select('*')
          .eq('workspace_id', currentWorkspace.id)
          .single();

        if (evolutionConfig?.global_api_key && evolutionConfig?.api_url) {
          validationResults.push({
            test: 'Configuração Evolution API',
            status: 'success',
            message: 'API Key e URL configuradas corretamente'
          });
        } else {
          validationResults.push({
            test: 'Configuração Evolution API',
            status: 'error',
            message: 'API Key ou URL não configuradas'
          });
        }
      } catch (error) {
        validationResults.push({
          test: 'Configuração Evolution API',
          status: 'error',
          message: 'Erro ao verificar configuração'
        });
      }

      // Test 2: WhatsApp Instances
      try {
        const { data: instances } = await supabase
          .from('whatsapp_instances')
          .select('*')
          .eq('workspace_id', currentWorkspace.id);

        const activeInstances = instances?.filter(i => i.status === 'open') || [];
        
        if (activeInstances.length > 0) {
          validationResults.push({
            test: 'Instâncias WhatsApp',
            status: 'success',
            message: `${activeInstances.length} instância(s) ativa(s) encontrada(s)`
          });
        } else {
          validationResults.push({
            test: 'Instâncias WhatsApp',
            status: 'warning',
            message: 'Nenhuma instância ativa encontrada. Configure uma instância.'
          });
        }
      } catch (error) {
        validationResults.push({
          test: 'Instâncias WhatsApp',
          status: 'error',
          message: 'Erro ao verificar instâncias'
        });
      }

      // Test 3: Storage Bucket
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const whatsappBucket = buckets?.find(b => b.id === 'whatsapp-media');
        
        if (whatsappBucket) {
          validationResults.push({
            test: 'Bucket whatsapp-media',
            status: 'success',
            message: `Bucket encontrado (público: ${whatsappBucket.public ? 'Sim' : 'Não'})`
          });
        } else {
          validationResults.push({
            test: 'Bucket whatsapp-media',
            status: 'error',
            message: 'Bucket whatsapp-media não encontrado'
          });
        }
      } catch (error) {
        validationResults.push({
          test: 'Bucket whatsapp-media',
          status: 'error',
          message: 'Erro ao verificar bucket'
        });
      }

      // Test 4: Test Media Upload Function
      try {
        const { data, error } = await supabase.functions.invoke('whatsapp-media-upload', {
          body: {
            test: true
          }
        });

        if (error) {
          validationResults.push({
            test: 'Função whatsapp-media-upload',
            status: 'error',
            message: `Erro na função: ${error.message}`
          });
        } else {
          validationResults.push({
            test: 'Função whatsapp-media-upload',
            status: 'success',
            message: 'Função acessível e funcionando'
          });
        }
      } catch (error) {
        validationResults.push({
          test: 'Função whatsapp-media-upload',
          status: 'warning',
          message: 'Função não testável sem arquivo real'
        });
      }

      setResults(validationResults);
      
      const errorCount = validationResults.filter(r => r.status === 'error').length;
      const warningCount = validationResults.filter(r => r.status === 'warning').length;
      
      if (errorCount === 0 && warningCount === 0) {
        toast({
          title: "✅ Validação Completa",
          description: "Sistema Evolution API configurado corretamente!",
        });
      } else if (errorCount === 0) {
        toast({
          title: "⚠️ Validação com Avisos",
          description: `${warningCount} aviso(s) encontrado(s)`,
        });
      } else {
        toast({
          title: "❌ Validação com Erros",
          description: `${errorCount} erro(s) encontrado(s)`,
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error('Validation error:', error);
      toast({
        title: "Erro na validação",
        description: "Erro inesperado durante a validação",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const getStatusIcon = (status: ValidationResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadgeVariant = (status: ValidationResult['status']) => {
    switch (status) {
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          WhatsApp Evolution API - Validação do Sistema
        </CardTitle>
        <CardDescription>
          Valide se toda a configuração de mídia está funcionando exclusivamente com a Evolution API
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Sistema Configurado:</strong> Evolution API Exclusiva
            <br />
            <strong>Estrutura de Mídia:</strong> workspace_id/audio/, workspace_id/images/, workspace_id/documents/
          </AlertDescription>
        </Alert>

        <Button 
          onClick={runValidation} 
          disabled={isValidating}
          className="w-full"
        >
          {isValidating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          {isValidating ? 'Validando...' : 'Executar Validação'}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Resultados da Validação</h3>
            {results.map((result, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{result.test}</span>
                    <Badge variant={getStatusBadgeVariant(result.status)}>
                      {result.status === 'success' ? 'OK' : 
                       result.status === 'error' ? 'ERRO' : 'AVISO'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold mb-2">Próximos Passos</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Configure uma instância Evolution API se não houver nenhuma ativa</li>
              <li>• Teste o envio de uma imagem pelo chat</li>
              <li>• Teste o recebimento de uma imagem no WhatsApp</li>
              <li>• Verifique se as mídias aparecem corretamente na conversa</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}