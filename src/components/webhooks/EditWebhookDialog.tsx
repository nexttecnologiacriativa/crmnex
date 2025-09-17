
import { useState, useEffect } from 'react';
import { useUpdateWebhook } from '@/hooks/useWebhooks';
import { usePipelines } from '@/hooks/usePipeline';
import { useWorkspaces } from '@/hooks/useWorkspace';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EditWebhookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhook: any;
  onClose: () => void;
}

export default function EditWebhookDialog({
  open,
  onOpenChange,
  webhook,
  onClose,
}: EditWebhookDialogProps) {
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [selectedStageId, setSelectedStageId] = useState<string>('');

  const { data: workspaces } = useWorkspaces();
  const currentWorkspace = workspaces?.[0];
  const { data: pipelines = [] } = usePipelines(currentWorkspace?.id);
  const updateWebhook = useUpdateWebhook();

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId);
  const stages = selectedPipeline?.pipeline_stages || [];

  useEffect(() => {
    if (webhook) {
      setName(webhook.name || '');
      setIsActive(webhook.is_active ?? true);
      setSelectedPipelineId(webhook.pipeline_id || '');
      setSelectedStageId(webhook.stage_id || 'first-stage');
    }
  }, [webhook]);

  // Reset stage when pipeline changes
  useEffect(() => {
    if (selectedPipelineId && stages.length > 0) {
      // Se não há stage selecionado ou o stage atual não pertence ao pipeline selecionado
      if (!selectedStageId || (selectedStageId !== 'first-stage' && !stages.find(s => s.id === selectedStageId))) {
        setSelectedStageId('first-stage'); // Vai usar o primeiro estágio do pipeline
      }
    }
  }, [selectedPipelineId, stages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    try {
      await updateWebhook.mutateAsync({
        id: webhook.id,
        name: name.trim(),
        is_active: isActive,
        pipeline_id: selectedPipelineId || null,
        stage_id: selectedStageId === 'first-stage' ? null : selectedStageId,
      });

      onClose();
    } catch (error) {
      console.error('Erro ao atualizar webhook:', error);
    }
  };

  if (!webhook) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Webhook</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do Webhook</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do webhook"
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="active">Webhook Ativo</Label>
          </div>

          <div>
            <Label htmlFor="pipeline">Pipeline de Destino</Label>
            <Select value={selectedPipelineId} onValueChange={setSelectedPipelineId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um pipeline" />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((pipeline) => (
                  <SelectItem key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {stages.length > 0 && (
            <div>
              <Label htmlFor="stage">Estágio Inicial (Opcional)</Label>
              <Select value={selectedStageId} onValueChange={setSelectedStageId}>
                <SelectTrigger>
                  <SelectValue placeholder="Primeiro estágio do pipeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first-stage">Primeiro estágio do pipeline</SelectItem>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="gradient-premium text-white"
              disabled={updateWebhook.isPending}
            >
              {updateWebhook.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
