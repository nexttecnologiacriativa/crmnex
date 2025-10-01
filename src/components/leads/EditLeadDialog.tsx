
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
import { useUpdateLead } from '@/hooks/useLeads';
import { usePipelines, usePipelineStages } from '@/hooks/usePipeline';
import { useUpdateLeadPipeline } from '@/hooks/useLeadPipelineRelations';
import CustomFieldsForm from './CustomFieldsForm';
import PhoneInput from './PhoneInput';

const editLeadSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  position: z.string().optional(),
  value: z.string().optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
  pipeline_id: z.string().optional(),
  stage_id: z.string().optional(),
  custom_fields: z.record(z.any()).optional(),
});

type EditLeadFormData = z.infer<typeof editLeadSchema>;

interface EditLeadDialogProps {
  lead: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditLeadDialog({ lead, open, onOpenChange }: EditLeadDialogProps) {
  const updateLead = useUpdateLead();
  const updateLeadPipeline = useUpdateLeadPipeline();
  const { data: pipelines } = usePipelines(lead?.workspace_id);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const { data: stages } = usePipelineStages(selectedPipelineId || lead?.pipeline_id);

  const form = useForm<EditLeadFormData>({
    resolver: zodResolver(editLeadSchema),
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
      stage_id: '',
      custom_fields: {},
    },
  });

  useEffect(() => {
    if (lead && open) {
      setSelectedPipelineId(lead.pipeline_id || '');
      form.reset({
        name: lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        company: lead.company || '',
        position: lead.position || '',
        value: lead.value ? lead.value.toString() : '',
        notes: lead.notes || '',
        source: lead.source || '',
        pipeline_id: lead.pipeline_id || '',
        stage_id: lead.stage_id || '',
        custom_fields: lead.custom_fields || {},
      });
    }
  }, [lead, open, form]);

  const onSubmit = async (data: EditLeadFormData) => {
    if (!lead) return;

    const updateData = {
      id: lead.id,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      company: data.company || null,
      position: data.position || null,
      value: data.value ? parseFloat(data.value) : null,
      notes: data.notes || null,
      source: data.source || null,
      custom_fields: data.custom_fields || {},
    };

    // Atualizar dados básicos do lead
    await updateLead.mutateAsync(updateData);

    // Se mudou pipeline ou stage, atualizar também
    if (data.pipeline_id && data.stage_id) {
      if (data.pipeline_id !== lead.pipeline_id || data.stage_id !== lead.stage_id) {
        await updateLeadPipeline.mutateAsync({
          lead_id: lead.id,
          pipeline_id: data.pipeline_id,
          stage_id: data.stage_id,
        });

        // Atualizar também na tabela leads (pipeline principal)
        await updateLead.mutateAsync({
          id: lead.id,
          pipeline_id: data.pipeline_id,
          stage_id: data.stage_id,
        });
      }
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Lead</DialogTitle>
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

              <FormField
                control={form.control}
                name="pipeline_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pipeline Principal</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedPipelineId(value);
                          form.setValue('stage_id', '');
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o pipeline" />
                        </SelectTrigger>
                        <SelectContent>
                          {pipelines?.map((pipeline) => (
                            <SelectItem key={pipeline.id} value={pipeline.id}>
                              {pipeline.name}
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
                name="stage_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estágio</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!selectedPipelineId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o estágio" />
                        </SelectTrigger>
                        <SelectContent>
                          {stages?.map((stage) => (
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

            <CustomFieldsForm form={form} workspaceId={lead?.workspace_id} />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateLead.isPending}>
                {updateLead.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
