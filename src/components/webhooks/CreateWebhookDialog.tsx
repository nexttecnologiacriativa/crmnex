
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateWebhook } from '@/hooks/useWebhooks';
import { usePipelines, usePipelineStages } from '@/hooks/usePipeline';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CreateWebhookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | undefined;
}

interface WebhookFormData {
  name: string;
  pipeline_id: string;
  stage_id: string;
}

export default function CreateWebhookDialog({ open, onOpenChange, workspaceId }: CreateWebhookDialogProps) {
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<WebhookFormData>();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [createdWebhook, setCreatedWebhook] = useState<any>(null);
  const createWebhook = useCreateWebhook();
  const { data: pipelines = [] } = usePipelines(workspaceId);
  const selectedPipelineId = watch('pipeline_id');
  const { data: stages = [] } = usePipelineStages(selectedPipelineId);

  const generateSecret = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const onSubmit = async (data: WebhookFormData) => {
    if (!workspaceId) return;

    const webhook = await createWebhook.mutateAsync({
      workspace_id: workspaceId,
      name: data.name,
      url: `https://mqotdnvwyjhyiqzbefpm.supabase.co/functions/v1/webhook-receiver`,
      secret: generateSecret(),
      is_active: true,
      pipeline_id: data.pipeline_id || null,
      stage_id: data.stage_id || null,
    });

    setCreatedWebhook(webhook);
  };

  const handleCopyUrl = async () => {
    if (createdWebhook) {
      const webhookUrl = `https://mqotdnvwyjhyiqzbefpm.supabase.co/functions/v1/webhook-receiver?webhook_id=${createdWebhook.id}`;
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleClose = () => {
    reset();
    setCreatedWebhook(null);
    setCopiedUrl(false);
    onOpenChange(false);
  };

  if (createdWebhook) {
    const webhookUrl = `https://mqotdnvwyjhyiqzbefpm.supabase.co/functions/v1/webhook-receiver?webhook_id=${createdWebhook.id}`;

    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Webhook Criado com Sucesso!</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>URL do Webhook</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input 
                  value={webhookUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyUrl}
                  className="flex-shrink-0"
                >
                  {copiedUrl ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-md">
              <h4 className="font-medium text-blue-900 mb-2">Como usar no Elementor:</h4>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Copie a URL acima</li>
                <li>2. No Elementor, vá nas configurações do formulário</li>
                <li>3. Em "Actions After Submit", adicione "Webhook"</li>
                <li>4. Cole a URL do webhook</li>
                <li>5. Configure os campos: name, email, phone, company, tags</li>
              </ol>
            </div>

            <div className="bg-green-50 p-4 rounded-md">
              <h4 className="font-medium text-green-900 mb-2">Pipeline configurado:</h4>
              <p className="text-sm text-green-800">
                Os leads serão criados no pipeline: <strong>{pipelines.find(p => p.id === createdWebhook.pipeline_id)?.name}</strong>
              </p>
            </div>

            <Button onClick={handleClose} className="w-full">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Webhook</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do Webhook *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Nome é obrigatório' })}
              placeholder="Ex: Formulário do Site"
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="pipeline_id">Pipeline *</Label>
            <select
              id="pipeline_id"
              {...register('pipeline_id', { required: 'Pipeline é obrigatório' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione um pipeline</option>
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </select>
            {errors.pipeline_id && (
              <p className="text-sm text-red-600 mt-1">{errors.pipeline_id.message}</p>
            )}
          </div>

          {selectedPipelineId && (
            <div>
              <Label htmlFor="stage_id">Estágio Inicial</Label>
              <select
                id="stage_id"
                {...register('stage_id')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Primeiro estágio</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2">Campos suportados:</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Obrigatórios:</strong> name (nome)</p>
              <p><strong>Opcionais:</strong> email, phone/telefone, company/empresa, message/mensagem</p>
              <p><strong>Tags:</strong> tags ou tag (separadas por vírgula)</p>
              <p><strong>UTM:</strong> utm_source, utm_medium, utm_campaign</p>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createWebhook.isPending}>
              {createWebhook.isPending ? 'Criando...' : 'Criar Webhook'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
