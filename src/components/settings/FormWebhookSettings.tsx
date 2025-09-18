import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useWorkspace } from '@/hooks/useWorkspace';
import { usePipelines } from '@/hooks/usePipeline';
import { useCustomFields } from '@/hooks/useCustomFields';

export default function FormWebhookSettings() {
  const { currentWorkspace } = useWorkspace();
  const { data: pipelines } = usePipelines(currentWorkspace?.id || '');
  const { data: customFields } = useCustomFields(currentWorkspace?.id || '');
  const [selectedPipeline, setSelectedPipeline] = useState<string>('');
  const [webhookUrl, setWebhookUrl] = useState<string>('');

  useEffect(() => {
    if (currentWorkspace?.id) {
      const baseUrl = 'https://mqotdnvwyjhyiqzbefpm.supabase.co/functions/v1/form-webhook';
      const params = new URLSearchParams({
        workspace_id: currentWorkspace.id,
        platform: 'elementor'
      });
      
      if (selectedPipeline) {
        params.append('pipeline_id', selectedPipeline);
      }
      
      setWebhookUrl(`${baseUrl}?${params.toString()}`);
    }
  }, [currentWorkspace?.id, selectedPipeline]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copiado!",
        description: "URL copiada para a área de transferência",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar a URL",
        variant: "destructive",
      });
    }
  };

  const defaultPipeline = pipelines?.find(p => p.is_default);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Webhook de Formulários</CardTitle>
          <CardDescription>
            Configure o webhook para receber dados de formulários do Elementor e outras plataformas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pipeline-select">Pipeline de Destino</Label>
            <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
              <SelectTrigger>
                <SelectValue placeholder={`Padrão: ${defaultPipeline?.name || 'Nenhum pipeline padrão'}`} />
              </SelectTrigger>
              <SelectContent>
                {pipelines?.map((pipeline) => (
                  <SelectItem key={pipeline.id} value={pipeline.id}>
                    {pipeline.name} {pipeline.is_default && '(Padrão)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook-url">URL do Webhook</Label>
            <div className="flex gap-2">
              <Input
                id="webhook-url"
                value={webhookUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(webhookUrl)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Use esta URL no seu formulário do Elementor ou outra plataforma
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Campos Personalizados Disponíveis</CardTitle>
          <CardDescription>
            Os dados do formulário serão mapeados automaticamente para estes campos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customFields && customFields.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {customFields.map((field) => (
                <Badge key={field.id} variant="secondary">
                  {field.name} ({field.field_type})
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              Nenhum campo personalizado criado ainda.{' '}
              <Button variant="link" className="p-0 h-auto">
                Criar campos personalizados
              </Button>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Como Configurar no Elementor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <p className="font-medium">Adicione um widget de formulário</p>
                <p className="text-sm text-muted-foreground">
                  Use o widget "Form" do Elementor Pro
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <p className="font-medium">Configure os campos</p>
                <p className="text-sm text-muted-foreground">
                  Use nomes como "name", "email", "phone" para campos básicos
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <p className="font-medium">Adicione ação "Webhook"</p>
                <p className="text-sm text-muted-foreground">
                  Em "Actions After Submit", adicione "Webhook"
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                4
              </div>
              <div>
                <p className="font-medium">Cole a URL do webhook</p>
                <p className="text-sm text-muted-foreground">
                  Use a URL gerada acima
                </p>
              </div>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Mapeamento Automático</h4>
            <p className="text-sm text-muted-foreground mb-2">
              O sistema mapeia automaticamente os campos do formulário:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <code>name</code>, <code>nome</code> → Nome do lead</li>
              <li>• <code>email</code>, <code>e_mail</code> → Email do lead</li>
              <li>• <code>phone</code>, <code>telefone</code> → Telefone do lead</li>
              <li>• Outros campos → Campos personalizados (por nome similar)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}