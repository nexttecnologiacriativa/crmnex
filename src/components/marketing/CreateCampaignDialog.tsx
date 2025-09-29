import { useState, useEffect } from 'react';
import { useCreateMarketingCampaign, CampaignTemplate } from '@/hooks/useMarketingCampaigns';
import { useLeadTags } from '@/hooks/useLeadTags';
import { usePipelines } from '@/hooks/usePipeline';
import { useLeads } from '@/hooks/useLeads';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useMarketingSettings } from '@/hooks/useMarketingSettings';
import { useWhatsAppInstances } from '@/hooks/useWhatsAppInstance';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Users, DollarSign, Clock, Send, MessageSquare, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';

interface CreateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateCampaignDialog({ open, onOpenChange }: CreateCampaignDialogProps) {
  const [campaignName, setCampaignName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [segmentationType, setSegmentationType] = useState<'tags' | 'pipeline' | 'leads'>('tags');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState('');
  const [startImmediately, setStartImmediately] = useState(true);
  const [tagLeadCount, setTagLeadCount] = useState(0);
  const [tagCounts, setTagCounts] = useState<Record<string, number>>({});
  const [leadsCount, setLeadsCount] = useState(0);
  
  // Novos estados para funcionalidades expandidas
  const [apiType, setApiType] = useState<'evolution'>('evolution');
  const [multipleTemplates, setMultipleTemplates] = useState<CampaignTemplate[]>([]);
  const [recipientType, setRecipientType] = useState<'leads' | 'custom_numbers'>('leads');
  const [customNumbers, setCustomNumbers] = useState<Array<{phone: string, name: string}>>([{phone: '', name: ''}]);
  const [messageInterval, setMessageInterval] = useState(1);

  const { currentWorkspace } = useWorkspace();
  const { data: leadTags = [] } = useLeadTags();
  const { data: pipelines = [] } = usePipelines();
  const { data: leads = [] } = useLeads();
  const { data: instances = [] } = useWhatsAppInstances();
  const { data: settings } = useMarketingSettings();
  const createCampaign = useCreateMarketingCampaign();

  const selectedPipelineData = pipelines.find(p => p.id === selectedPipeline);

  useEffect(() => {
    if (settings) {
      setApiType('evolution');
      setMessageInterval(settings.evolution_message_interval || 2);
    }
  }, [settings]);

  const calculateTagLeadCount = () => {
    const counts: Record<string, number> = {};
    let totalCount = 0;

    selectedTags.forEach(tagId => {
      const count = leads.filter(lead => 
        lead.lead_tag_relations?.some(relation => relation.tag_id === tagId)
      ).length;
      counts[tagId] = count;
      totalCount += count;
    });

    setTagCounts(counts);
    setTagLeadCount(totalCount);
  };

  useEffect(() => {
    if (segmentationType === 'tags') {
      calculateTagLeadCount();
    }
  }, [selectedTags, leads, segmentationType]);

  useEffect(() => {
    if (segmentationType === 'leads') {
      setLeadsCount(selectedLeads.length);
    }
  }, [selectedLeads, segmentationType]);

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleLeadToggle = (leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const addCustomNumber = () => {
    setCustomNumbers([...customNumbers, {phone: '', name: ''}]);
  };

  const removeCustomNumber = (index: number) => {
    setCustomNumbers(customNumbers.filter((_, i) => i !== index));
  };

  const updateCustomNumber = (index: number, field: 'phone' | 'name', value: string) => {
    const updated = [...customNumbers];
    updated[index][field] = value;
    setCustomNumbers(updated);
  };

  const addTemplate = () => {
    const newTemplate: CampaignTemplate = {
      id: Date.now().toString(),
      name: `Template ${multipleTemplates.length + 1}`,
      preview: ''
    };
    setMultipleTemplates([...multipleTemplates, newTemplate]);
  };

  const removeTemplate = (id: string) => {
    setMultipleTemplates(multipleTemplates.filter(t => t.id !== id));
  };

  const updateTemplate = (id: string, field: keyof CampaignTemplate, value: string) => {
    setMultipleTemplates(multipleTemplates.map(t => 
      t.id === id ? { ...t, [field]: value } : t
    ));
  };

  const handleSubmit = async () => {
    if (!campaignName.trim()) {
      toast({
        title: "Erro",
        description: "Nome da campanha é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (!currentWorkspace) {
      toast({
        title: "Erro",
        description: "Workspace não encontrado",
        variant: "destructive",
      });
      return;
    }

    try {
      const campaignData = {
        name: campaignName,
        workspace_id: currentWorkspace.id,
        template_id: templateId,
        segments: {
          type: segmentationType,
          tags: selectedTags,
          pipeline_id: selectedPipeline,
          stage_id: selectedStage,
          leads: selectedLeads
        },
        scheduled_at: startImmediately ? null : (scheduledDate && scheduledTime 
          ? `${format(scheduledDate, 'yyyy-MM-dd')}T${scheduledTime}`
          : null),
        api_type: apiType,
        multiple_templates: multipleTemplates,
        recipient_type: recipientType,
        custom_numbers: recipientType === 'custom_numbers' ? customNumbers.map(cn => cn.phone) : [],
        message_interval_minutes: messageInterval
      };

      await createCampaign.mutateAsync(campaignData);
      
      // Reset form
      setCampaignName('');
      setTemplateId('');
      setSelectedTags([]);
      setSelectedLeads([]);
      setScheduledDate(undefined);
      setScheduledTime('');
      setStartImmediately(true);
      setMultipleTemplates([]);
      setCustomNumbers([{phone: '', name: ''}]);
      
      onOpenChange(false);
      
      toast({
        title: "Sucesso",
        description: "Campanha criada com sucesso!",
      });
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar campanha",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Nova Campanha de Marketing
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="name">Nome da Campanha</Label>
              <Input
                id="name"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Digite o nome da campanha"
              />
            </div>
          </div>

          <Tabs defaultValue="recipients" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="recipients">Destinatários</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="schedule">Agendamento</TabsTrigger>
              <TabsTrigger value="settings">Configurações</TabsTrigger>
            </TabsList>

            <TabsContent value="recipients" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Tipo de Destinatário</CardTitle>
                  <CardDescription>
                    Escolha se deseja enviar para leads do CRM ou números personalizados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={recipientType} onValueChange={setRecipientType as any}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="leads" id="leads" />
                      <Label htmlFor="leads">Leads do CRM</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom_numbers" id="custom_numbers" />
                      <Label htmlFor="custom_numbers">Números Personalizados</Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              {recipientType === 'leads' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Segmentação</CardTitle>
                    <CardDescription>
                      Escolha como segmentar seus leads
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup value={segmentationType} onValueChange={setSegmentationType as any}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="tags" id="tags" />
                        <Label htmlFor="tags">Por Tags</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="pipeline" id="pipeline" />
                        <Label htmlFor="pipeline">Por Pipeline/Estágio</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="leads" id="specific-leads" />
                        <Label htmlFor="specific-leads">Leads Específicos</Label>
                      </div>
                    </RadioGroup>

                    {segmentationType === 'tags' && (
                      <div className="mt-4">
                        <Label>Tags Disponíveis</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {leadTags.map(tag => (
                            <div key={tag.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={tag.id}
                                checked={selectedTags.includes(tag.id)}
                                onCheckedChange={() => handleTagToggle(tag.id)}
                              />
                              <Label htmlFor={tag.id} className="flex items-center gap-2">
                                <Badge style={{ backgroundColor: tag.color }} className="text-white">
                                  {tag.name}
                                </Badge>
                                {tagCounts[tag.id] !== undefined && (
                                  <span className="text-sm text-gray-500">
                                    ({tagCounts[tag.id]} leads)
                                  </span>
                                )}
                              </Label>
                            </div>
                          ))}
                        </div>
                        {tagLeadCount > 0 && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm font-medium flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Total de leads selecionados: {tagLeadCount}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {segmentationType === 'pipeline' && (
                      <div className="mt-4 space-y-4">
                        <div>
                          <Label>Pipeline</Label>
                          <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um pipeline" />
                            </SelectTrigger>
                            <SelectContent>
                              {pipelines.map(pipeline => (
                                <SelectItem key={pipeline.id} value={pipeline.id}>
                                  {pipeline.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {selectedPipelineData && (
                          <div>
                            <Label>Estágio</Label>
                            <Select value={selectedStage} onValueChange={setSelectedStage}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um estágio" />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedPipelineData.pipeline_stages?.map(stage => (
                                  <SelectItem key={stage.id} value={stage.id}>
                                    {stage.name}
                                  </SelectItem>
                                ))}\\
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}

                    {segmentationType === 'leads' && (
                      <div className="mt-4">
                        <Label>Leads Disponíveis</Label>
                        <div className="max-h-60 overflow-y-auto mt-2 space-y-2">
                          {leads.map(lead => (
                            <div key={lead.id} className="flex items-center space-x-2 p-2 border rounded">
                              <Checkbox
                                id={lead.id}
                                checked={selectedLeads.includes(lead.id)}
                                onCheckedChange={() => handleLeadToggle(lead.id)}
                              />
                              <Label htmlFor={lead.id} className="flex-1">
                                <div>
                                  <p className="font-medium">{lead.name}</p>
                                  <p className="text-sm text-gray-500">{lead.email}</p>
                                  {lead.phone && (
                                    <p className="text-sm text-gray-500">{lead.phone}</p>
                                  )}
                                </div>
                              </Label>
                            </div>
                          ))}
                        </div>
                        {leadsCount > 0 && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm font-medium flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Leads selecionados: {leadsCount}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {recipientType === 'custom_numbers' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Números Personalizados</CardTitle>
                    <CardDescription>
                      Adicione os números para os quais deseja enviar a campanha
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {customNumbers.map((number, index) => (
                        <div key={index} className="grid grid-cols-5 gap-2 items-center">
                          <div className="col-span-2">
                            <Input
                              placeholder="Nome do contato"
                              value={number.name}
                              onChange={(e) => updateCustomNumber(index, 'name', e.target.value)}
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              placeholder="55119999999999"
                              value={number.phone}
                              onChange={(e) => updateCustomNumber(index, 'phone', e.target.value)}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeCustomNumber(index)}
                            disabled={customNumbers.length === 1}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addCustomNumber}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Número
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Templates de Mensagem</CardTitle>
                  <CardDescription>
                    Configure os templates que serão enviados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {multipleTemplates.length === 0 && (
                    <div className="text-center p-6">
                      <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500 mb-4">Nenhum template configurado</p>
                      <Button onClick={addTemplate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Template
                      </Button>
                    </div>
                  )}

                  {multipleTemplates.map((template, index) => (
                    <Card key={template.id} className="mb-4">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Template {index + 1}</CardTitle>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeTemplate(template.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label>Nome do Template</Label>
                          <Input
                            value={template.name}
                            onChange={(e) => updateTemplate(template.id, 'name', e.target.value)}
                            placeholder="Nome do template"
                          />
                        </div>
                        <div>
                          <Label>Mensagem</Label>
                          <Textarea
                            value={template.preview}
                            onChange={(e) => updateTemplate(template.id, 'preview', e.target.value)}
                            placeholder="Digite sua mensagem aqui..."
                            rows={4}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {multipleTemplates.length > 0 && (
                    <Button onClick={addTemplate} variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Mais Template
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Quando Enviar</CardTitle>
                  <CardDescription>
                    Configure quando a campanha deve ser executada
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={startImmediately ? 'now' : 'later'} onValueChange={(value) => setStartImmediately(value === 'now')}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="now" id="now" />
                      <Label htmlFor="now">Enviar Imediatamente</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="later" id="later" />
                      <Label htmlFor="later">Agendar para Depois</Label>
                    </div>
                  </RadioGroup>

                  {!startImmediately && (
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <Label>Data</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !scheduledDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {scheduledDate ? format(scheduledDate, "dd/MM/yyyy") : "Selecionar data"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={scheduledDate}
                              onSelect={setScheduledDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label htmlFor="time">Horário</Label>
                        <Input
                          id="time"
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações de Envio</CardTitle>
                  <CardDescription>
                    Configure como as mensagens serão enviadas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Intervalo entre Mensagens (minutos)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="60"
                      value={messageInterval}
                      onChange={(e) => setMessageInterval(parseInt(e.target.value) || 1)}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Intervalo de {messageInterval} minuto(s) entre cada mensagem
                    </p>
                  </div>

                  {instances.length > 0 && (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-green-800">
                        ✓ Instância Evolution API conectada
                      </p>
                    </div>
                  )}

                  {instances.length === 0 && (
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <p className="text-sm font-medium text-yellow-800">
                        ⚠️ Nenhuma instância Evolution API encontrada
                      </p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Configure uma instância WhatsApp para enviar campanhas
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Separator />

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createCampaign.isPending}
            >
              {createCampaign.isPending ? 'Criando...' : 'Criar e Executar Campanha'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreateCampaignDialog;
