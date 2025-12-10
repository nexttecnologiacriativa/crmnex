import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreateLead } from '@/hooks/useLeads';
import { useWorkspace } from '@/hooks/useWorkspace';
import { usePipelines } from '@/hooks/usePipeline';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import CustomFieldsForm from './CustomFieldsForm';
import PhoneInput from './PhoneInput';
import TagSelectorForCreate from './TagSelectorForCreate';
import { useAddTagToLead } from '@/hooks/useLeadTags';

const createLeadSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  position: z.string().optional(),
  value: z.string().optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
  pipeline_id: z.string().min(1, 'Pipeline é obrigatório'),
  custom_fields: z.record(z.any()).optional(),
});

type CreateLeadFormData = z.infer<typeof createLeadSchema>;

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateLeadDialog({ open, onOpenChange }: CreateLeadDialogProps) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { data: pipelines = [] } = usePipelines(currentWorkspace?.id);
  const createLead = useCreateLead();
  const addTagToLead = useAddTagToLead();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // Buscar o usuário administrador do workspace
  const { data: adminUser } = useQuery({
    queryKey: ['workspace-admin', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;
      
      const { data, error } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', currentWorkspace.id)
        .eq('role', 'admin')
        .single();

      if (error) {
        console.error('Erro ao buscar administrador:', error);
        return null;
      }

      return data?.user_id || null;
    },
    enabled: !!currentWorkspace?.id,
  });

  const form = useForm<CreateLeadFormData>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      company: '',
      position: '',
      value: '',
      notes: '',
      source: '',
      pipeline_id: '',
      custom_fields: {},
    },
  });

  // Observar mudanças no pipeline selecionado para aplicar valores padrão
  const selectedPipelineId = form.watch('pipeline_id');
  
  useEffect(() => {
    if (selectedPipelineId && pipelines.length > 0) {
      const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId);
      if (selectedPipeline) {
        // Aplicar valor padrão se existir e o campo de valor estiver vazio
        if (selectedPipeline.default_value && !form.getValues('value')) {
          form.setValue('value', selectedPipeline.default_value.toString());
        }
      }
    }
  }, [selectedPipelineId, pipelines, form]);

  const onSubmit = async (data: CreateLeadFormData) => {
    if (!currentWorkspace || !user) return;

    const selectedPipeline = pipelines.find(p => p.id === data.pipeline_id);
    if (!selectedPipeline || !selectedPipeline.pipeline_stages?.length) {
      console.error('Pipeline not found or has no stages');
      return;
    }

    const firstStage = selectedPipeline.pipeline_stages[0];

    // Determinar o responsável: 1. Default assignee do pipeline, 2. Admin do workspace, 3. Usuário atual
    let assignedTo = user.id; // fallback padrão
    
    if (selectedPipeline.default_assignee) {
      assignedTo = selectedPipeline.default_assignee;
    } else if (adminUser) {
      assignedTo = adminUser;
    }

    const leadData = {
      workspace_id: currentWorkspace.id,
      pipeline_id: data.pipeline_id,
      stage_id: firstStage.id,
      assigned_to: assignedTo,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      company: data.company || null,
      position: data.position || null,
      value: data.value ? parseFloat(data.value) : null,
      currency: 'BRL',
      notes: data.notes || null,
      status: 'new' as const,
      source: data.source || null,
      custom_fields: data.custom_fields || {},
    };

    const createdLead = await createLead.mutateAsync(leadData);
    
    // Adicionar tags ao lead criado
    if (selectedTagIds.length > 0 && createdLead?.id) {
      for (const tagId of selectedTagIds) {
        try {
          await addTagToLead.mutateAsync({ leadId: createdLead.id, tagId });
        } catch (error) {
          console.error('Erro ao adicionar tag:', error);
        }
      }
    }
    
    form.reset();
    setSelectedTagIds([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Lead</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome do lead" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="email@exemplo.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormControl>
                      <PhoneInput
                        value={field.value}
                        onChange={field.onChange}
                        label="Telefone"
                        placeholder="(11) 99999-9999"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome da empresa" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Cargo na empresa" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pipeline_id"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Pipeline *</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o pipeline" />
                        </SelectTrigger>
                        <SelectContent>
                          {pipelines.map((pipeline) => (
                            <SelectItem key={pipeline.id} value={pipeline.id}>
                              {pipeline.name}
                              {pipeline.is_default && ' (Padrão)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" placeholder="0,00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origem</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a origem" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="social_media">Redes Sociais</SelectItem>
                          <SelectItem value="referral">Indicação</SelectItem>
                          <SelectItem value="advertising">Publicidade</SelectItem>
                          <SelectItem value="cold_call">Ligação Fria</SelectItem>
                          <SelectItem value="event">Evento</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Observações sobre o lead" rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <CustomFieldsForm form={form} workspaceId={currentWorkspace?.id} />

            <TagSelectorForCreate 
              selectedTagIds={selectedTagIds} 
              onTagsChange={setSelectedTagIds} 
            />
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createLead.isPending}>
                {createLead.isPending ? 'Criando...' : 'Criar Lead'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
