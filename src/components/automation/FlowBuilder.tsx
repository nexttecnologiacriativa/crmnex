import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  Tag, 
  Clock, 
  Plus, 
  ArrowDown, 
  Settings,
  Save,
  X,
  Trash2,
  Zap,
  AlertCircle
} from 'lucide-react';
import { useAutomationFlows } from '@/hooks/useAutomationFlows';
import { useLeadTags } from '@/hooks/useLeadTags';
import { useMetaTemplates } from '@/hooks/useMetaTemplates';
import { usePipelines, usePipelineStages } from '@/hooks/usePipeline';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useWhatsAppInstances } from '@/hooks/useWhatsAppInstance';
import { toast } from 'sonner';

interface FlowBuilderProps {
  flow: any;
  onClose: () => void;
}

interface FlowStep {
  id: string;
  type: 'send_message' | 'apply_tag' | 'wait' | 'move_to_stage';
  config: any;
  position: number;
}

export default function FlowBuilder({ flow, onClose }: FlowBuilderProps) {
  const [flowSteps, setFlowSteps] = useState<FlowStep[]>(flow.steps || []);
  const [flowName, setFlowName] = useState(flow.name || '');
  const [flowDescription, setFlowDescription] = useState(flow.description || '');
  const [isActive, setIsActive] = useState(flow.is_active ?? true);
  const [selectedStep, setSelectedStep] = useState<FlowStep | null>(null);
  const [loading, setLoading] = useState(false);

  const [triggerTags, setTriggerTags] = useState<string[]>(flow.trigger_config?.tags || []);

  const { data: tags = [] } = useLeadTags();
  const { templates } = useMetaTemplates();
  const { updateFlow, refreshFlows } = useAutomationFlows();
  const { currentWorkspace } = useWorkspace();
  const { data: pipelines = [] } = usePipelines(currentWorkspace?.id);
  const { data: instances = [] } = useWhatsAppInstances();
  
  // Get pipeline stages for move_to_stage configuration
  const selectedPipelineId = selectedStep?.config?.pipeline_id;
  const { data: availableStages = [] } = usePipelineStages(selectedPipelineId || undefined);

  const stepTypes = [
    {
      type: 'send_message',
      icon: MessageSquare,
      label: 'Enviar Mensagem',
      color: 'blue',
      description: 'Enviar template WhatsApp Oficial ou mensagem personalizada via Evolution API'
    },
    {
      type: 'apply_tag',
      icon: Tag,
      label: 'Aplicar Tag',
      color: 'purple',
      description: 'Adicionar tag ao lead'
    },
    {
      type: 'wait',
      icon: Clock,
      label: 'Aguardar',
      color: 'yellow',
      description: 'Pausar execução por tempo determinado'
    },
    {
      type: 'move_to_stage',
      icon: Plus,
      label: 'Mover para Etapa',
      color: 'green',
      description: 'Mover lead para outra etapa do pipeline'
    }
  ];

  const handleAddStep = (stepType: string) => {
    const newStep: FlowStep = {
      id: Date.now().toString(),
      type: stepType as any,
      config: stepType === 'send_message' ? { send_type: 'template' } : {},
      position: flowSteps.length
    };
    
    setFlowSteps([...flowSteps, newStep]);
    setSelectedStep(newStep);
  };

  const handleRemoveStep = (stepId: string) => {
    setFlowSteps(flowSteps.filter(step => step.id !== stepId));
    if (selectedStep?.id === stepId) {
      setSelectedStep(null);
    }
  };

  const handleStepConfigChange = (stepId: string, config: any) => {
    setFlowSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, config } : step
    ));
    // Keep selectedStep in sync so controlled inputs/selects update immediately
    setSelectedStep(prev => (prev && prev.id === stepId) ? { ...prev, config } : prev);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Validar passos
      for (const step of flowSteps) {
        if (step.type === 'send_message') {
          if (step.config.send_type === 'evolution') {
            if (!step.config.evolution_instance) {
              toast.error('Selecione uma instância Evolution para todas as mensagens via Evolution API');
              setLoading(false);
              return;
            }
            if (!step.config.message || step.config.message.trim() === '') {
              toast.error('Digite uma mensagem personalizada para envio via Evolution API');
              setLoading(false);
              return;
            }
          } else if (!step.config.template) {
            toast.error('Selecione um template para todas as mensagens via WhatsApp Oficial');
            setLoading(false);
            return;
          }
        }
        if (step.type === 'apply_tag' && !step.config.tag_id) {
          toast.error('Selecione uma tag para todos os passos de aplicação');
          setLoading(false);
          return;
        }
        if (step.type === 'wait' && (!step.config.minutes || step.config.minutes <= 0)) {
          toast.error('Configure um tempo válido para todos os passos de espera');
          setLoading(false);
          return;
        }
        if (step.type === 'move_to_stage' && (!step.config.pipeline_id || !step.config.stage_id)) {
          toast.error('Selecione pipeline e etapa para todos os passos de movimentação');
          setLoading(false);
          return;
        }
      }

      // Validar trigger de tags, quando aplicável
      if ((flow.trigger_type === 'tag_applied' || flow.trigger_type === 'lead_created_with_tag') && triggerTags.length === 0) {
        toast.error('Selecione ao menos uma tag para o gatilho');
        setLoading(false);
        return;
      }

      console.log('💾 Salvando fluxo e aguardando sincronização...');

      // Atualizar o fluxo e aguardar sincronização completa
      await updateFlow(flow.id, {
        name: flowName,
        description: flowDescription,
        is_active: isActive,
        steps: flowSteps,
        trigger_config: (flow.trigger_type === 'tag_applied' || flow.trigger_type === 'lead_created_with_tag')
          ? { tags: triggerTags }
          : undefined
      });

      // Aguardar um momento para garantir que os dados foram recarregados
      await new Promise(resolve => setTimeout(resolve, 300));

      console.log('✅ Fluxo salvo e sincronizado com sucesso');
      onClose();
      
    } catch (error) {
      console.error('Error saving flow:', error);
      toast.error('Erro ao salvar fluxo');
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (type: string) => {
    const stepType = stepTypes.find(s => s.type === type);
    return stepType?.icon || MessageSquare;
  };

  const getStepColor = (type: string) => {
    const stepType = stepTypes.find(s => s.type === type);
    return stepType?.color || 'gray';
  };

  const getStepLabel = (type: string) => {
    const stepType = stepTypes.find(s => s.type === type);
    return stepType?.label || 'Ação';
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Editor de Fluxo</span>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleSave}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="h-4 w-4 mr-1" />
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button size="sm" variant="outline" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            Configure os passos do seu fluxo de automação
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-[75vh] gap-6">
          {/* Sidebar esquerda - Configurações gerais */}
          <div className="w-80 border-r bg-gray-50 p-4 overflow-y-auto">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-4 text-gray-900">Configurações Gerais</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="flow-name">Nome do Fluxo</Label>
                    <Input
                      id="flow-name"
                      value={flowName}
                      onChange={(e) => setFlowName(e.target.value)}
                      placeholder="Nome do fluxo"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="flow-description">Descrição</Label>
                    <Textarea
                      id="flow-description"
                      value={flowDescription}
                      onChange={(e) => setFlowDescription(e.target.value)}
                      placeholder="Descrição do fluxo"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <Label htmlFor="is-active">Fluxo Ativo</Label>
                      <p className="text-sm text-gray-600">
                        Ativar execução automática
                      </p>
                    </div>
                    <Switch
                      id="is-active"
                      checked={isActive}
                      onCheckedChange={setIsActive}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4 text-gray-900">Componentes</h3>
                
                <div className="space-y-3">
                  {stepTypes.map((stepType) => (
                    <Card 
                      key={stepType.type}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleAddStep(stepType.type)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`p-1 rounded bg-${stepType.color}-100`}>
                            <stepType.icon className={`h-4 w-4 text-${stepType.color}-600`} />
                          </div>
                          <span className="font-medium text-sm">{stepType.label}</span>
                        </div>
                        <p className="text-xs text-gray-600">{stepType.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Canvas central - Fluxo */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-25">
            <div className="max-w-2xl mx-auto space-y-4">
              {/* Gatilho inicial */}
              <Card className="border-2 border-purple-200 bg-purple-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="p-1 rounded bg-purple-200">
                      <Tag className="h-5 w-5 text-purple-600" />
                    </div>
                    Gatilho: {flow.trigger_type === 'tag_applied' ? 'Tag Aplicada' : 
                             flow.trigger_type === 'pipeline_stage_changed' ? 'Mudança de Etapa' : 
                             flow.trigger_type}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      {flow.trigger_type}
                    </Badge>
                  </div>

                  {(flow.trigger_type === 'tag_applied' || flow.trigger_type === 'lead_created_with_tag') && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-700">Tags que disparam este fluxo:</p>
                      <div className="flex flex-wrap gap-2 p-3 bg-white/60 rounded border">
                        {tags.map((t) => (
                          <Badge
                            key={t.id}
                            variant={triggerTags.includes(t.id) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => setTriggerTags((prev) => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id])}
                            style={{ backgroundColor: triggerTags.includes(t.id) ? t.color : undefined, borderColor: t.color }}
                          >
                            {t.name}
                          </Badge>
                        ))}
                      </div>
                      {triggerTags.length === 0 && (
                        <p className="text-xs text-red-600">Selecione pelo menos uma tag.</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Seta para baixo */}
              {flowSteps.length > 0 && (
                <div className="flex justify-center">
                  <ArrowDown className="h-6 w-6 text-gray-400" />
                </div>
              )}

              {/* Passos do fluxo */}
              {flowSteps.map((step, index) => {
                const StepIcon = getStepIcon(step.type);
                const stepColor = getStepColor(step.type);
                const stepLabel = getStepLabel(step.type);

                return (
                  <div key={step.id}>
                    <Card 
                      className={`border-2 border-${stepColor}-200 bg-${stepColor}-50 relative group cursor-pointer ${
                        selectedStep?.id === step.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => setSelectedStep(step)}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <StepIcon className={`h-5 w-5 text-${stepColor}-600`} />
                            {stepLabel}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveStep(step.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {step.type === 'send_message' && (
                            <div className="space-y-1">
                              {step.config.send_type === 'evolution' ? (
                                <>
                                  <div className="flex items-center gap-1">
                                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                      Evolution API
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    <strong>Instância:</strong> {step.config.evolution_instance || 'Não configurada'}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    <strong>Mensagem:</strong> {step.config.message ? 
                                      (step.config.message.length > 50 ? 
                                        step.config.message.substring(0, 50) + '...' : 
                                        step.config.message) : 
                                      'Não configurada'
                                    }
                                  </p>
                                </>
                              ) : (
                                <>
                                  <div className="flex items-center gap-1">
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                                      WhatsApp Oficial
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    <strong>Template:</strong> {step.config.template || 'Não configurado'}
                                  </p>
                                </>
                              )}
                            </div>
                          )}
                          {step.type === 'apply_tag' && (
                            <p className="text-sm text-gray-600">
                              Tag: {tags.find(t => t.id === step.config.tag_id)?.name || 'Não configurado'}
                            </p>
                          )}
                          {step.type === 'wait' && (
                            <p className="text-sm text-gray-600">
                              Aguardar: {step.config.minutes || 0} minutos
                            </p>
                          )}
                          {step.type === 'move_to_stage' && (
                            <div className="space-y-1">
                              <p className="text-sm text-gray-600">
                                Pipeline: {pipelines.find(p => p.id === step.config.pipeline_id)?.name || 'Não configurado'}
                              </p>
                              <p className="text-sm text-gray-600">
                                Etapa: {availableStages.find(s => s.id === step.config.stage_id)?.name || 'Não configurada'}
                              </p>
                            </div>
                          )}
                          <Badge variant="outline">
                            Passo {index + 1}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Seta para o próximo passo */}
                    {index < flowSteps.length - 1 && (
                      <div className="flex justify-center">
                        <ArrowDown className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Botão para adicionar mais passos */}
              <div className="flex justify-center">
                <Card className="border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <Plus className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600">Arraste um componente aqui</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Sidebar direita - Configuração do passo selecionado */}
          <div className="w-80 border-l bg-gray-50 p-4 overflow-y-auto">
            {selectedStep ? (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">
                  Configurar: {getStepLabel(selectedStep.type)}
                </h3>

                {selectedStep.type === 'send_message' && (
                  <div className="space-y-4">
                    {templates.length === 0 || templates.every(t => t.id.includes('_message') || t.id.includes('_up') || t.id.includes('_reminder')) ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-yellow-800">Templates Mock em uso</h4>
                            <p className="text-sm text-yellow-700 mt-1">
                              Configure o WhatsApp Oficial nas <strong>Configurações</strong> para usar seus templates reais aprovados pelo Meta.
                            </p>
                            <p className="text-xs text-yellow-600 mt-2">
                              Os templates abaixo são apenas para demonstração.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    
                    <div className="space-y-2">
                      <Label>Tipo de Envio</Label>
                      <Select 
                        value={selectedStep.config.send_type || 'template'} 
                        onValueChange={(value) => handleStepConfigChange(selectedStep.id, { 
                          ...selectedStep.config, 
                          send_type: value,
                          // Reset specific configs when changing type
                          template: value === 'evolution' ? undefined : selectedStep.config.template,
                          evolution_instance: value === 'template' ? undefined : selectedStep.config.evolution_instance,
                          message: value === 'template' ? undefined : selectedStep.config.message
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de envio" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="template">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              Template WhatsApp Oficial
                            </div>
                          </SelectItem>
                          <SelectItem value="evolution">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              Mensagem via Evolution API
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(!selectedStep.config.send_type || selectedStep.config.send_type === 'template') && (
                      <div className="space-y-2">
                        <Label>Template WhatsApp</Label>
                        <Select 
                          value={selectedStep.config.template || ''} 
                          onValueChange={(value) => handleStepConfigChange(selectedStep.id, { ...selectedStep.config, template: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um template" />
                          </SelectTrigger>
                          <SelectContent>
                            {templates.map((template) => (
                              <SelectItem key={template.id} value={template.name}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{template.name}</span>
                                  <Badge variant={template.status === 'APPROVED' ? 'default' : 'secondary'} className="ml-2">
                                    {template.status}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-600">
                          Apenas templates aprovados pelo Meta podem ser usados
                        </p>
                      </div>
                    )}

                    {selectedStep.config.send_type === 'evolution' && (
                      <div className="space-y-4">
                        <Alert>
                          <Zap className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Evolution API:</strong> Envie mensagens personalizadas diretamente através da sua instância Evolution conectada.
                          </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                          <Label>Instância Evolution API</Label>
                          <Select 
                            value={selectedStep.config.evolution_instance || ''} 
                            onValueChange={(value) => handleStepConfigChange(selectedStep.id, { ...selectedStep.config, evolution_instance: value })}
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
                                        instance.status === 'open' ? 'bg-green-500' : 
                                        instance.status === 'connecting' ? 'bg-yellow-500' : 
                                        'bg-red-500'
                                      }`}
                                    />
                                    {instance.instance_name}
                                    <span className="text-xs text-gray-500">
                                      ({instance.status === 'open' ? 'conectada' : 
                                        instance.status === 'connecting' ? 'conectando' : 
                                        instance.status === 'refused' ? 'recusada' :
                                        'desconectada'})
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {instances.length === 0 ? (
                            <Alert className="border-yellow-200 bg-yellow-50">
                              <AlertCircle className="h-4 w-4 text-yellow-600" />
                              <AlertDescription className="text-yellow-800">
                                Nenhuma instância Evolution encontrada. Configure primeiro no <strong>Atendimento → WhatsApp Evolution</strong>.
                              </AlertDescription>
                            </Alert>
                          ) : instances.filter(i => i.status === 'open').length === 0 ? (
                            <Alert className="border-red-200 bg-red-50">
                              <AlertCircle className="h-4 w-4 text-red-600" />
                              <AlertDescription className="text-red-800">
                                Nenhuma instância conectada encontrada. Verifique o status das suas instâncias.
                              </AlertDescription>
                            </Alert>
                          ) : null}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="evolution-message">Mensagem Personalizada *</Label>
                          <Textarea
                            id="evolution-message"
                            placeholder="Digite sua mensagem personalizada aqui...

Exemplo:
Olá {nome}! 👋

Obrigado por se interessar pelos nossos serviços. 

Vamos entrar em contato em breve!"
                            value={selectedStep.config.message || ''}
                            onChange={(e) => handleStepConfigChange(selectedStep.id, { ...selectedStep.config, message: e.target.value })}
                            rows={6}
                            className="font-mono text-sm"
                          />
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm font-medium text-blue-900 mb-2">Variáveis disponíveis:</p>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <Badge variant="outline" className="bg-blue-100 text-blue-800">{'{nome}'}</Badge>
                              <Badge variant="outline" className="bg-blue-100 text-blue-800">{'{empresa}'}</Badge>
                              <Badge variant="outline" className="bg-blue-100 text-blue-800">{'{telefone}'}</Badge>
                              <Badge variant="outline" className="bg-blue-100 text-blue-800">{'{email}'}</Badge>
                              <Badge variant="outline" className="bg-blue-100 text-blue-800">{'{cargo}'}</Badge>
                            </div>
                            <p className="text-xs text-blue-700 mt-2">
                              As variáveis serão substituídas automaticamente pelos dados do lead.
                            </p>
                          </div>
                          {!selectedStep.config.message && (
                            <p className="text-sm text-red-600 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              Mensagem é obrigatória para envio via Evolution API
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedStep.type === 'move_to_stage' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Pipeline de Destino</Label>
                      <Select 
                        value={selectedStep.config.pipeline_id || ''} 
                        onValueChange={(value) => {
                          handleStepConfigChange(selectedStep.id, { 
                            ...selectedStep.config, 
                            pipeline_id: value,
                            stage_id: '' // Reset stage when pipeline changes
                          });
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
                    </div>

                    <div className="space-y-2">
                      <Label>Etapa de Destino</Label>
                      <Select 
                        value={selectedStep.config.stage_id || ''} 
                        onValueChange={(value) => handleStepConfigChange(selectedStep.id, { ...selectedStep.config, stage_id: value })}
                        disabled={!selectedStep.config.pipeline_id}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma etapa" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStages.length === 0 && selectedStep.config.pipeline_id ? (
                            <div className="px-2 py-3 text-sm text-gray-500 text-center">
                              Carregando etapas...
                            </div>
                          ) : availableStages.length === 0 ? (
                            <div className="px-2 py-3 text-sm text-gray-500 text-center">
                              Selecione um pipeline primeiro
                            </div>
                          ) : (
                            availableStages.map((stage) => (
                              <SelectItem key={stage.id} value={stage.id}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: stage.color }}
                                  />
                                  {stage.name}
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-600">
                        {!selectedStep.config.pipeline_id 
                          ? 'Selecione um pipeline para ver as etapas disponíveis'
                          : 'Etapa para onde o lead será movido'}
                      </p>
                    </div>
                  </div>
                )}

                {selectedStep.type === 'apply_tag' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tag para Aplicar</Label>
                      <Select 
                        value={selectedStep.config.tag_id || ''} 
                        onValueChange={(value) => handleStepConfigChange(selectedStep.id, { ...selectedStep.config, tag_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma tag" />
                        </SelectTrigger>
                        <SelectContent>
                          {tags.map((tag) => (
                            <SelectItem key={tag.id} value={tag.id}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: tag.color }}
                                />
                                {tag.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {selectedStep.type === 'wait' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tempo de Espera (minutos)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={selectedStep.config.minutes || ''}
                        onChange={(e) => handleStepConfigChange(selectedStep.id, { ...selectedStep.config, minutes: parseInt(e.target.value) || 0 })}
                        placeholder="60"
                      />
                      <p className="text-xs text-gray-600">
                        Tempo em minutos para aguardar antes do próximo passo
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 mt-12">
                <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Selecione um passo para configurar</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}