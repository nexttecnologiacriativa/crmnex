
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useCreateLead } from '@/hooks/useLeads';
import { useWorkspace } from '@/hooks/useWorkspace';
import { usePipelines } from '@/hooks/usePipeline';
import { useLeadTags, useCreateLeadTag, useAddTagToLead } from '@/hooks/useLeadTags';
import { useAddLeadToPipeline } from '@/hooks/useLeadPipelineRelations';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import { useEffect } from 'react';

interface CreateLeadFromConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: string;
  contactName?: string;
  conversationId: string;
  onLeadCreated?: (leadId: string) => void;
}

export default function CreateLeadFromConversationDialog({
  open,
  onOpenChange,
  phoneNumber,
  contactName,
  conversationId,
  onLeadCreated
}: CreateLeadFromConversationDialogProps) {
  const [formData, setFormData] = useState({
    name: contactName || 'Sem Cadastro',
    email: '',
    company: '',
    notes: ''
  });
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [selectedStageId, setSelectedStageId] = useState<string>('');

  // Tags state
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [tagSearchValue, setTagSearchValue] = useState('');

  const { currentWorkspace } = useWorkspace();
  const { data: pipelines = [] } = usePipelines(currentWorkspace?.id);
  const createLead = useCreateLead();
  const { data: allTags = [] } = useLeadTags();
  const createTag = useCreateLeadTag();
  const addTagToLead = useAddTagToLead();
  const addLeadToPipeline = useAddLeadToPipeline();

  const defaultPipeline = pipelines.find(p => p.is_default) || pipelines[0];
  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId);
  const firstStage = defaultPipeline?.pipeline_stages?.[0];

  // Definir pipeline padrão quando os pipelines carregarem
  useEffect(() => {
    if (defaultPipeline && !selectedPipelineId) {
      setSelectedPipelineId(defaultPipeline.id);
    }
  }, [defaultPipeline, selectedPipelineId]);

  // Definir primeira etapa quando pipeline mudar
  useEffect(() => {
    if (selectedPipeline?.pipeline_stages?.[0] && !selectedStageId) {
      setSelectedStageId(selectedPipeline.pipeline_stages[0].id);
    } else if (selectedPipeline && selectedStageId) {
      // Verificar se a etapa selecionada pertence ao pipeline atual
      const stageExists = selectedPipeline.pipeline_stages?.some(stage => stage.id === selectedStageId);
      if (!stageExists && selectedPipeline.pipeline_stages?.[0]) {
        setSelectedStageId(selectedPipeline.pipeline_stages[0].id);
      }
    }
  }, [selectedPipeline, selectedStageId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (!currentWorkspace) {
      toast.error('Erro na configuração do workspace');
      return;
    }

    const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId);
    const selectedStage = selectedPipeline?.pipeline_stages?.find(s => s.id === selectedStageId);
    
    if (!selectedPipeline) {
      toast.error('Selecione um pipeline válido');
      return;
    }

    if (!selectedStage) {
      toast.error('Selecione uma etapa válida');
      return;
    }

    try {
      const leadData = {
        name: formData.name.trim(),
        phone: phoneNumber,
        email: formData.email.trim() || undefined,
        company: formData.company.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        workspace_id: currentWorkspace.id,
        pipeline_id: selectedPipeline.id,
        stage_id: selectedStage.id,
        assigned_to: currentWorkspace.owner_id,
        currency: 'BRL',
        status: 'new' as const,
        source: 'WhatsApp',
        skip_automation: true // Evitar disparo de automação
      };

      const newLead = await createLead.mutateAsync(leadData);
      
      // Criar relacionamento no pipeline (garantir sincronização)
      if (newLead.id) {
        try {
          await addLeadToPipeline.mutateAsync({
            lead_id: newLead.id,
            pipeline_id: selectedPipeline.id,
            stage_id: selectedStage.id,
            is_primary: true
          });
        } catch (pipelineError) {
          console.error('Erro ao adicionar lead ao pipeline:', pipelineError);
        }
        
        // Atualizar a conversa com o lead_id
        const { supabase } = await import('@/integrations/supabase/client');
        await supabase
          .from('whatsapp_conversations')
          .update({ lead_id: newLead.id })
          .eq('id', conversationId);
      }

      // Adicionar tags ao lead se foram selecionadas
      if (selectedTags.length > 0) {
        for (const tagId of selectedTags) {
          try {
            await addTagToLead.mutateAsync({ leadId: newLead.id, tagId });
          } catch (error) {
            console.error('Erro ao adicionar tag ao lead:', error);
          }
        }
      }

      onLeadCreated?.(newLead.id);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: contactName || 'Sem Cadastro',
        email: '',
        company: '',
        notes: ''
      });
      setSelectedTags([]);
      setTagSearchValue('');
      setSelectedPipelineId(defaultPipeline?.id || '');
      setSelectedStageId(defaultPipeline?.pipeline_stages?.[0]?.id || '');

      toast.success('Lead criado com sucesso!');
      
    } catch (error) {
      console.error('Error creating lead:', error);
      toast.error('Erro ao criar lead');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Criar Lead da Conversa</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome do contato"
                required
              />
          </div>

          <div>
            <Label htmlFor="pipeline">Pipeline *</Label>
            <Select
              value={selectedPipelineId}
              onValueChange={setSelectedPipelineId}
              required
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

          <div>
            <Label htmlFor="stage">Etapa *</Label>
            <Select
              value={selectedStageId}
              onValueChange={setSelectedStageId}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma etapa" />
              </SelectTrigger>
              <SelectContent>
                {selectedPipeline?.pipeline_stages?.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={phoneNumber}
                disabled
                className="bg-gray-100"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="email@exemplo.com"
            />
          </div>

          <div>
            <Label htmlFor="company">Empresa</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
              placeholder="Nome da empresa"
            />
          </div>

          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {selectedTags.map((tagId) => {
                const tag = allTags.find(t => t.id === tagId);
                if (!tag) return null;
                return (
                  <Badge
                    key={tagId}
                    variant="secondary"
                    className="flex items-center gap-1"
                    style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color }}
                  >
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => setSelectedTags(prev => prev.filter(id => id !== tagId))}
                      className="ml-1 h-3 w-3 hover:bg-gray-200 rounded-full flex items-center justify-center"
                    >
                      <X className="h-2 w-2" />
                    </button>
                  </Badge>
                );
              })}
              
              <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-6 px-2">
                    <Plus className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Buscar ou criar tag..." 
                      value={tagSearchValue}
                      onValueChange={setTagSearchValue}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {tagSearchValue.trim() && !allTags.find(tag => tag.name.toLowerCase() === tagSearchValue.toLowerCase()) ? (
                          <div className="p-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                if (!tagSearchValue.trim()) return;
                                try {
                                  const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f97316'];
                                  const randomColor = colors[Math.floor(Math.random() * colors.length)];
                                  const newTag = await createTag.mutateAsync({
                                    name: tagSearchValue.trim(),
                                    color: randomColor
                                  });
                                  setSelectedTags(prev => [...prev, newTag.id]);
                                  setTagPopoverOpen(false);
                                  setTagSearchValue('');
                                } catch (error) {
                                  console.error('Erro ao criar tag:', error);
                                }
                              }}
                              className="w-full justify-start text-xs"
                            >
                              <Plus className="h-3 w-3 mr-2" />
                              Criar "{tagSearchValue.trim()}"
                            </Button>
                          </div>
                        ) : (
                          "Nenhuma tag encontrada."
                        )}
                      </CommandEmpty>
                      <CommandGroup>
                        {allTags
                          .filter(tag => 
                            !selectedTags.includes(tag.id) && 
                            tag.name.toLowerCase().includes(tagSearchValue.toLowerCase())
                          )
                          .map((tag) => (
                            <CommandItem
                              key={tag.id}
                              onSelect={() => {
                                setSelectedTags(prev => [...prev, tag.id]);
                                setTagPopoverOpen(false);
                                setTagSearchValue('');
                              }}
                              className="flex items-center gap-2"
                            >
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: tag.color }}
                              />
                              {tag.name}
                            </CommandItem>
                          ))
                        }
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Observações sobre o lead..."
              className="min-h-[80px]"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createLead.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {createLead.isPending ? 'Criando...' : 'Criar Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
