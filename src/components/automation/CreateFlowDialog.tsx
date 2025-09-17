import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAutomationFlows } from '@/hooks/useAutomationFlows';
import { useLeadTags } from '@/hooks/useLeadTags';
import { usePipelines, usePipelineStages } from '@/hooks/usePipeline';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useWhatsAppInstances } from '@/hooks/useWhatsAppInstance';
import { Badge } from '@/components/ui/badge';
import { Tag, Zap, Clock, MessageSquare } from 'lucide-react';

interface CreateFlowDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateFlowDialog({ open, onClose, onSuccess }: CreateFlowDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_type: 'lead_created_with_tag',
    trigger_config: {},
    send_once_per_lead: true,
    is_active: true
  });

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [messageConfig, setMessageConfig] = useState({
    send_type: 'evolution',
    message: '',
    evolution_instance: ''
  });
  const { createFlow, loading } = useAutomationFlows();
  const { data: tags = [] } = useLeadTags();
  const { currentWorkspace } = useWorkspace();
  const { data: pipelines = [] } = usePipelines(currentWorkspace?.id);
  const { data: stages = [] } = usePipelineStages(selectedPipelineId || undefined);
  const { data: instances = [] } = useWhatsAppInstances();

  const triggerTypes = [
    { 
      value: 'lead_created_with_tag', 
      label: 'Lead Criado com Tag Específica',
      description: 'Dispara quando um lead é criado já com uma tag específica',
      icon: Tag
    },
    { 
      value: 'tag_applied', 
      label: 'Tag Aplicada ao Lead',
      description: 'Dispara quando uma tag específica é aplicada',
      icon: Tag
    },
    { 
      value: 'lead_created', 
      label: 'Lead Criado',
      description: 'Dispara quando um novo lead é criado',
      icon: Zap
    },
    { 
      value: 'time_based', 
      label: 'Baseado em Tempo',
      description: 'Dispara após um período específico',
      icon: Clock
    },
    {
      value: 'pipeline_stage_changed',
      label: 'Mudança de Etapa no Pipeline',
      description: 'Dispara quando lead muda de etapa',
      icon: MessageSquare
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let triggerConfig = {};
    
    if (formData.trigger_type === 'tag_applied' || formData.trigger_type === 'lead_created_with_tag') {
      triggerConfig = { tags: selectedTags };
    } else if (formData.trigger_type === 'pipeline_stage_changed') {
      triggerConfig = { 
        pipeline_id: selectedPipelineId,
        target_stage_id: selectedStageId 
      };
    }
    
    // Criar step de mensagem se for lead_created_with_tag e tiver mensagem configurada
    let steps = [];
    if (formData.trigger_type === 'lead_created_with_tag' && messageConfig.message.trim()) {
      steps = [{
        id: Date.now().toString(),
        type: 'send_message',
        config: messageConfig,
        position: 0
      }];
    }

    const flowData = {
      ...formData,
      trigger_config: triggerConfig,
      steps: steps
    };

    try {
      await createFlow(flowData);
      onSuccess();
      setFormData({
        name: '',
        description: '',
        trigger_type: 'lead_created_with_tag',
        trigger_config: {},
        send_once_per_lead: true,
        is_active: true
      });
      setSelectedTags([]);
      setSelectedPipelineId('');
      setSelectedStageId('');
      setMessageConfig({
        send_type: 'evolution',
        message: '',
        evolution_instance: ''
      });
    } catch (error) {
      console.error('Error creating flow:', error);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const selectedTrigger = triggerTypes.find(t => t.value === formData.trigger_type);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Criar Novo Fluxo de Automação
          </DialogTitle>
          <DialogDescription>
            Configure um fluxo automático de mensagens WhatsApp baseado em gatilhos
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Fluxo</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Boas-vindas novos leads"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="trigger_type">Tipo de Gatilho</Label>
              <Select 
                value={formData.trigger_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, trigger_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {triggerTypes.map((trigger) => (
                    <SelectItem key={trigger.value} value={trigger.value}>
                      <div className="flex items-center gap-2">
                        <trigger.icon className="h-4 w-4" />
                        {trigger.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva o propósito deste fluxo..."
              rows={3}
            />
          </div>

          {selectedTrigger && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <selectedTrigger.icon className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">{selectedTrigger.label}</span>
              </div>
              <p className="text-sm text-blue-700">{selectedTrigger.description}</p>
            </div>
          )}

          {(formData.trigger_type === 'tag_applied' || formData.trigger_type === 'lead_created_with_tag') && (
            <div className="space-y-3">
              <Label>Tags que disparam o fluxo</Label>
              <p className="text-sm text-gray-600">
                {formData.trigger_type === 'lead_created_with_tag' 
                  ? 'Selecione as tags que irão ativar este fluxo quando um lead for criado já com essas tags'
                  : 'Selecione as tags que irão ativar este fluxo quando aplicadas a um lead'
                }
              </p>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-3 border rounded-lg">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-blue-100"
                    onClick={() => toggleTag(tag.id)}
                    style={{ 
                      backgroundColor: selectedTags.includes(tag.id) ? tag.color : undefined,
                      borderColor: tag.color 
                    }}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
              {selectedTags.length === 0 && (
                <p className="text-sm text-red-600">
                  Selecione pelo menos uma tag para continuar
                </p>
              )}
            </div>
          )}

          {formData.trigger_type === 'pipeline_stage_changed' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Pipeline</Label>
                <Select 
                  value={selectedPipelineId} 
                  onValueChange={(value) => {
                    setSelectedPipelineId(value);
                    setSelectedStageId(''); // Reset stage when pipeline changes
                  }}
                >
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
                <p className="text-sm text-gray-600">
                  Pipeline onde o gatilho será monitorado
                </p>
              </div>

              <div className="space-y-2">
                <Label>Etapa de Destino</Label>
                <Select 
                  value={selectedStageId} 
                  onValueChange={setSelectedStageId}
                  disabled={!selectedPipelineId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: stage.color }}
                          />
                          {stage.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-600">
                  Etapa que irá disparar o fluxo quando o lead chegar nela
                </p>
              </div>

              {(!selectedPipelineId || !selectedStageId) && (
                <p className="text-sm text-red-600">
                  Selecione pipeline e etapa para continuar
                </p>
              )}
            </div>
          )}

          {formData.trigger_type === 'lead_created_with_tag' && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Configurar Mensagem Inicial
              </h4>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Tipo de Envio</Label>
                  <Select 
                    value={messageConfig.send_type} 
                    onValueChange={(value) => setMessageConfig(prev => ({ ...prev, send_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="evolution">Mensagem via Evolution API</SelectItem>
                      <SelectItem value="template">Template WhatsApp Oficial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {messageConfig.send_type === 'evolution' && (
                  <>
                    <div className="space-y-2">
                      <Label>Instância Evolution</Label>
                      <Select 
                        value={messageConfig.evolution_instance} 
                        onValueChange={(value) => setMessageConfig(prev => ({ ...prev, evolution_instance: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma instância" />
                        </SelectTrigger>
                        <SelectContent>
                          {instances.map((instance) => (
                            <SelectItem key={instance.instance_name} value={instance.instance_name}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className={`w-2 h-2 rounded-full ${
                                    instance.status === 'open' ? 'bg-green-500' : 'bg-red-500'
                                  }`} 
                                />
                                {instance.instance_name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-blue-600">
                        Instância Evolution API para envio da mensagem
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Mensagem</Label>
                      <Textarea
                        value={messageConfig.message}
                        onChange={(e) => setMessageConfig(prev => ({ ...prev, message: e.target.value }))}
                        placeholder="Digite a mensagem que será enviada automaticamente..."
                        rows={3}
                        className="resize-none"
                      />
                      <p className="text-xs text-blue-600">
                        Você pode usar variáveis como {"{nome}"} para personalizar
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="send_once">Enviar apenas uma vez por lead</Label>
              <p className="text-sm text-gray-600">
                Se ativado, cada lead receberá a mensagem apenas uma vez, mesmo que o gatilho seja acionado novamente
              </p>
            </div>
            <Switch
              id="send_once"
              checked={formData.send_once_per_lead}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, send_once_per_lead: checked }))}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div>
              <Label htmlFor="is_active">Ativar fluxo após criação</Label>
              <p className="text-sm text-gray-600">
                O fluxo começará a funcionar imediatamente após ser criado
              </p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || 
                ((formData.trigger_type === 'tag_applied' || formData.trigger_type === 'lead_created_with_tag') && selectedTags.length === 0) ||
                (formData.trigger_type === 'pipeline_stage_changed' && (!selectedPipelineId || !selectedStageId)) ||
                (formData.trigger_type === 'lead_created_with_tag' && messageConfig.send_type === 'evolution' && 
                 (!messageConfig.evolution_instance || !messageConfig.message.trim()))
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Criando...' : 'Criar Fluxo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}