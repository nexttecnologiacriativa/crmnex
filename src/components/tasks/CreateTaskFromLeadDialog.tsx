
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreateTask } from '@/hooks/useTasks';
import { getLeadDisplayName } from '@/lib/leadUtils';
import { useAuth } from '@/hooks/useAuth';

const createTaskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  due_date: z.string().optional(),
  due_time: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

type CreateTaskFormData = z.infer<typeof createTaskSchema>;

interface CreateTaskFromLeadDialogProps {
  lead: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateTaskFromLeadDialog({ lead, open, onOpenChange }: CreateTaskFromLeadDialogProps) {
  const { user } = useAuth();
  const createTask = useCreateTask();

  const form = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: '',
      description: '',
      due_date: '',
      due_time: '',
      priority: 'medium',
    },
  });

  const onSubmit = async (data: CreateTaskFormData) => {
    if (!user || !lead) return;

    // Combinar data e hora se ambos estiverem preenchidos
    let dueDateTime = null;
    if (data.due_date) {
      if (data.due_time) {
        dueDateTime = new Date(`${data.due_date}T${data.due_time}`).toISOString();
      } else {
        dueDateTime = new Date(`${data.due_date}T00:00:00`).toISOString();
      }
    }

    const taskData = {
      workspace_id: lead.workspace_id,
      lead_id: lead.id,
      assigned_to: user.id,
      created_by: user.id,
      title: data.title,
      description: data.description || null,
      due_date: dueDateTime,
      priority: data.priority,
      status: 'pending' as const,
    };

    await createTask.mutateAsync(taskData);
    form.reset();
    onOpenChange(false);
  };

  const priorityLabels = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Tarefa para {getLeadDisplayName(lead || {})}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Título da tarefa" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Descrição da tarefa" rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Vencimento</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora</FormLabel>
                    <FormControl>
                      <Input {...field} type="time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridade</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a prioridade" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(priorityLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? 'Criando...' : 'Criar Tarefa'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
