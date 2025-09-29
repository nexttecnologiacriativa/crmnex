import { useState, useEffect } from 'react';
import { useCreateMarketingCampaign, CampaignTemplate } from '@/hooks/useMarketingCampaigns';
import { useMetaTemplates } from '@/hooks/useMetaTemplates';
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
import { CalendarIcon, Users, DollarSign, Clock, Send, MessageSquare, Plus, X, Settings, FileText } from 'lucide-react';
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

export default function CreateCampaignDialog({ open, onOpenChange }: CreateCampaignDialogProps) {
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
  const [recipientType, setRecipientType] = useState<'leads' | 'custom_numbers' | 'csv_upload'>('leads');
  const [customNumbers, setCustomNumbers] = useState('');
  const [messageInterval, setMessageInterval] = useState(2);
  const [multipleTemplates, setMultipleTemplates] = useState<CampaignTemplate[]>([]);
  const [currentTab, setCurrentTab] = useState('basic');
  const [selectedInstance, setSelectedInstance] = useState('');

  const { currentWorkspace } = useWorkspace();
  const { data: templates } = useMetaTemplates();
  const { data: tags } = useLeadTags();
  const { data: pipelines } = usePipelines(currentWorkspace?.id || '');
  const { data: leads } = useLeads();
  const { data: marketingSettings } = useMarketingSettings();
  const { data: whatsappInstances } = useWhatsAppInstances();
  const createCampaign = useCreateMarketingCampaign();

  // Fechar modal imediatamente após criar campanha - a execução continua em background
  useEffect(() => {
    if (createCampaign.isError) {
      toast({ title: 'Erro ao criar campanha', variant: 'destructive' });
    }
  }, [createCampaign.isError]);

  // Configurar valores padrão baseado nas configurações
  useEffect(() => {
    if (marketingSettings) {
      setApiType(marketingSettings.default_api_type);
      setMessageInterval(marketingSettings.evolution_message_interval);
    }
  }, [marketingSettings]);

  // Buscar contagem de leads por tag no workspace atual e atualizar total selecionado
  useEffect(() => {
    const fetchTagCounts = async () => {
      if (!currentWorkspace?.id) {
        setTagCounts({});
        setTagLeadCount(0);
        return;
      }
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error } = await supabase
          .from('lead_tag_relations')
          .select('tag_id, lead_id, leads!inner(id, workspace_id, phone)')
          .eq('leads.workspace_id', currentWorkspace.id)
          .not('leads.phone', 'is', null)
          .neq('leads.phone', '');
        if (error) throw error;
        const counts: Record<string, number> = {};
        const seen: Record<string, Set<string>> = {};
        (data || []).forEach((row: any) => {
          const tagId = row.tag_id;
          const leadId = row.lead_id;
          if (!seen[tagId]) seen[tagId] = new Set<string>();
          seen[tagId].add(leadId);
        });
        Object.keys(seen).forEach(tagId => {
          counts[tagId] = seen[tagId].size;
        });
        setTagCounts(counts);
        const total = selectedTags.reduce((acc, id) => acc + (counts[id] || 0), 0);
        setTagLeadCount(total);
      } catch (error) {
        console.error('Error fetching tag counts:', error);
        setTagCounts({});
        setTagLeadCount(0);
      }
    };
    fetchTagCounts();
  }, [currentWorkspace?.id]);

  // Atualizar total quando seleção de tags mudar
  useEffect(() => {
    const total = selectedTags.reduce((acc, id) => acc + (tagCounts[id] || 0), 0);
    setTagLeadCount(total);
  }, [selectedTags, tagCounts]);

  const getTotalLeadsCount = () => {
    if (recipientType === 'leads') {
      if (segmentationType === 'tags') {
        return tagLeadCount;
      } else if (segmentationType === 'leads') {
        return selectedLeads.length;
      }
      return leadsCount;
    } else if (recipientType === 'custom_numbers') {
      return customNumbers.split('\n').filter(n => n.trim()).length;
    }
    return 0;
  };

  const getEstimatedCost = () => {
    const totalLeads = getTotalLeadsCount();
    const costPerMessage = 0.05; // Evolution API cost
    const usdToBrl = 5.5;
    return (totalLeads * costPerMessage * usdToBrl).toFixed(2);
  };

  const resetForm = () => {
    setCampaignName('');
    setTemplateId('');
    setSelectedTags([]);
    setSelectedPipeline('');
    setSelectedStage('');
    setSelectedLeads([]);
    setScheduledDate(undefined);
    setScheduledTime('');
    setStartImmediately(true);
    setCustomNumbers('');
    setMultipleTemplates([]);
    setSelectedInstance('');
    setCurrentTab('basic');
  };

  const handleSubmit = () => {
    if (!campaignName.trim()) {
      toast({ title: 'Informe o nome da campanha', variant: 'destructive' });
      return;
    }

    // Evolution API sempre pronta - sem validação de template necessária
      toast({ title: 'Selecione uma instância Evolution conectada', variant: 'destructive' });
      return;
    }

    if (recipientType === 'custom_numbers' && !customNumbers.trim()) {
      toast({ title: 'Adicione ao menos um número de telefone', variant: 'destructive' });
      return;
    }

    const segments = recipientType === 'leads' 
      ? segmentationType === 'tags' 
        ? { tags: selectedTags }
        : segmentationType === 'pipeline'
        ? { pipeline_id: selectedPipeline, stage_id: selectedStage }
        : { leads: selectedLeads }
      : undefined;

    let scheduledAt: string | undefined;
    if (!startImmediately && scheduledDate && scheduledTime) {
      const [hours, minutes] = scheduledTime.split(':');
      const scheduleDateTime = new Date(scheduledDate);
      scheduleDateTime.setHours(parseInt(hours), parseInt(minutes));
      scheduledAt = scheduleDateTime.toISOString();
    }

    const selectedTemplate = templates?.find(t => t.id === templateId);

    // Processar números personalizados
    const customNumbersList = recipientType === 'custom_numbers' 
      ? customNumbers.split('\n').map(n => n.trim()).filter(n => n)
      : [];

    createCampaign.mutate({
      name: campaignName,
      template_id: templateId,
      template_name: selectedTemplate?.name,
      message_preview: selectedTemplate?.components?.find((c: any) => c.type === 'BODY')?.text,
      segments,
      scheduled_at: scheduledAt,
      start_immediately: startImmediately,
      api_type: apiType,
      message_interval_minutes: apiType === 'evolution' ? messageInterval : undefined,
      custom_numbers: customNumbersList,
      recipient_type: recipientType,
      multiple_templates: multipleTemplates.length > 0 ? multipleTemplates : undefined,
      evolution_instance: apiType === 'evolution' ? selectedInstance : undefined
    });

    // Fechar dialog imediatamente - campanha executará em background
    toast({ title: 'Campanha iniciada! A execução continuará em background.', variant: 'default' });
    resetForm();
    onOpenChange(false);
    setTimeout(() => createCampaign.reset(), 500);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Criar Nova Campanha de Marketing
          </DialogTitle>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Básico</TabsTrigger>
            <TabsTrigger value="recipients">Destinatários</TabsTrigger>
            <TabsTrigger value="messages">Mensagens</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="campaign-name">Nome da Campanha *</Label>
                  <Input
                    id="campaign-name"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Ex: Promoção Black Friday"
                  />
                </div>

                <div>
                  <Label>API Configurada</Label>
                  <div className="text-sm text-muted-foreground p-2 bg-green-50 rounded border border-green-200">
                    <p className="text-green-800 font-medium">✅ Evolution API Exclusiva</p>
                    <p className="text-green-700">Sistema configurado para uso exclusivo da Evolution API</p>
                  </div>
                </div>

                {apiType === 'evolution' && (
                  <div>
                    <Label htmlFor="instance">Instância Evolution API *</Label>
                    <Select value={selectedInstance} onValueChange={setSelectedInstance}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma instância conectada" />
                      </SelectTrigger>
                      <SelectContent>
                        {whatsappInstances?.filter(instance => instance.status === 'open').map((instance) => (
                          <SelectItem key={instance.id} value={instance.instance_name}>
                            <div className="flex items-center gap-2">
                              <span>{instance.instance_name}</span>
                              <Badge variant="outline" className="text-green-600">Conectada</Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {whatsappInstances && whatsappInstances.filter(i => i.status === 'open').length === 0 && (
                      <div className="text-sm text-destructive mt-1">
                        Nenhuma instância Evolution API conectada. Configure em Configurações → WhatsApp.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Resumo da Campanha
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">{getTotalLeadsCount()}</div>
                      <div className="text-xs text-muted-foreground">Destinatários</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">R$ {getEstimatedCost()}</div>
                      <div className="text-xs text-muted-foreground">Custo Estimado</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <Badge variant={startImmediately ? "default" : "secondary"}>
                      {startImmediately ? "Envio Imediato" : "Agendado"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="recipients" className="space-y-6">
            <div>
              <Label className="text-base font-medium">Tipo de Destinatários</Label>
              <RadioGroup value={recipientType} onValueChange={(value: 'leads' | 'custom_numbers') => setRecipientType(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="leads" id="leads" />
                  <Label htmlFor="leads">Leads do CRM</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom_numbers" id="custom_numbers" />
                  <Label htmlFor="custom_numbers">Lista de Números</Label>
                </div>
              </RadioGroup>
            </div>

            {recipientType === 'leads' && (
              <div className="space-y-4">
                <div>
                  <Label>Método de Segmentação</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <Button
                      type="button"
                      variant={segmentationType === 'tags' ? 'default' : 'outline'}
                      onClick={() => setSegmentationType('tags')}
                      size="sm"
                    >
                      Por Tags
                    </Button>
                    <Button
                      type="button"
                      variant={segmentationType === 'pipeline' ? 'default' : 'outline'}
                      onClick={() => setSegmentationType('pipeline')}
                      size="sm"
                    >
                      Por Pipeline
                    </Button>
                    <Button
                      type="button"
                      variant={segmentationType === 'leads' ? 'default' : 'outline'}
                      onClick={() => setSegmentationType('leads')}
                      size="sm"
                    >
                      Seleção Manual
                    </Button>
                  </div>
                </div>

                {segmentationType === 'tags' && (
                  <div className="space-y-3">
                    <Label>Selecionar Tags</Label>
                    <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                      {tags?.map((tag) => (
                        <div key={tag.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={tag.id}
                            checked={selectedTags.includes(tag.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTags([...selectedTags, tag.id]);
                              } else {
                                setSelectedTags(selectedTags.filter(id => id !== tag.id));
                              }
                            }}
                          />
                          <Label htmlFor={tag.id} className="flex items-center gap-2 cursor-pointer">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                            <span>{tag.name}</span>
                            <Badge variant="outline" className="text-xs">{tagCounts?.[tag.id] ?? 0}</Badge>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {recipientType === 'custom_numbers' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="custom-numbers">Lista de Números de Telefone *</Label>
                  <Textarea
                    id="custom-numbers"
                    value={customNumbers}
                    onChange={(e) => setCustomNumbers(e.target.value)}
                    placeholder="Digite um número por linha:&#10;5511999999999&#10;5511888888888&#10;..."
                    rows={8}
                    className="font-mono text-sm"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Digite um número por linha (com código do país e DDD)
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            {/* Evolution API configurada - sistema simplificado */}
            <div className="text-sm text-muted-foreground p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="font-medium text-green-800">✅ Evolution API Configurada</p>
              <p className="text-green-700">Sistema configurado para uso exclusivo da Evolution API.</p>
              <p className="text-green-700">Mídia, templates e envios gerenciados automaticamente.</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Mensagens da Campanha</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTemplate}
                  className="flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Adicionar Mensagem
                </Button>
              </div>

              <div className="space-y-3">
                {multipleTemplates.map((template, index) => (
                  <Card key={template.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">Mensagem {index + 1}</CardTitle>
                        {multipleTemplates.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTemplate(template.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label>Nome da Mensagem</Label>
                        <Input
                          value={template.name}
                          onChange={(e) => updateTemplate(template.id, 'name', e.target.value)}
                          placeholder="Ex: Saudação inicial"
                        />
                      </div>
                      <div>
                        <Label>Conteúdo da Mensagem</Label>
                        <Textarea
                          value={template.preview}
                          onChange={(e) => updateTemplate(template.id, 'preview', e.target.value)}
                          placeholder="Digite o conteúdo da mensagem..."
                          rows={4}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {multipleTemplates.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Adicione pelo menos uma mensagem para continuar</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Agendamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="immediate"
                      checked={startImmediately}
                      onCheckedChange={(checked) => setStartImmediately(!!checked)}
                    />
                    <Label htmlFor="immediate">Enviar imediatamente</Label>
                  </div>

                  {!startImmediately && (
                    <div className="space-y-3">
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
                              {scheduledDate ? format(scheduledDate, "PPP") : "Selecionar data"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={scheduledDate}
                              onSelect={setScheduledDate}
                              disabled={(date) => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                return date < today;
                              }}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label>Horário</Label>
                        <Input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {apiType === 'evolution' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Configurações Evolution API
                    </CardTitle>
                    <CardDescription>
                      Configure o intervalo entre mensagens para evitar bloqueios
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <Label htmlFor="interval">Intervalo entre mensagens (minutos)</Label>
                      <Input
                        id="interval"
                        type="number"
                        min="1"
                        max="60"
                        value={messageInterval}
                        onChange={(e) => setMessageInterval(parseInt(e.target.value) || 2)}
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        Recomendado: 2-5 minutos para evitar restrições
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="flex justify-end gap-3 items-center">
          {getTotalLeadsCount() === 0 && (
            <div className="mr-auto text-xs text-muted-foreground">
              Nenhum destinatário estimado pelos filtros. Você ainda pode criar a campanha.
            </div>
          )}
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
       </DialogContent>
     </Dialog>
   );
}

export default CreateCampaignDialog;