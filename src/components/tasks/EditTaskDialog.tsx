
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
import { useUpdateTask } from '@/hooks/useTasks';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspaces } from '@/hooks/useWorkspace';
import { format } from 'date-fns';

const editTaskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  due_date: z.string().optional(),
  due_time: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  assigned_to: z.string().optional(),
});

type EditTaskFormData = z.infer<typeof editTaskSchema>;

interface EditTaskDialogProps {
  task: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditTaskDialog({ task, open, onOpenChange }: EditTaskDialogProps) {
  const updateTask = useUpdateTask();
  const { data: workspaces } = useWorkspaces();
  const currentWorkspace = workspaces?.[0];

  // Buscar membros do workspace
  const { data: workspaceMembers = [] } = useQuery({
    queryKey: ['workspace-members', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          user_id,
          role,
          profiles!workspace_members_user_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('workspace_id', currentWorkspace.id);

      if (error) {
        console.error('Erro ao buscar membros do workspace:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  const form = useForm<EditTaskFormData>({
    resolver: zodResolver(editTaskSchema),
    defaultValues: {
      title: '',
      description: '',
      due_date: '',
      due_time: '',
      priority: 'medium',
      status: 'pending',
      assigned_to: '',
    },
  });

  useEffect(() => {
    if (task && open) {
      let dueDate = '';
      let dueTime = '';
      
      if (task.due_date) {
        const date = new Date(task.due_date);
        dueDate = format(date, 'yyyy-MM-dd');
        dueTime = format(date, 'HH:mm');
      }

      form.reset({
        title: task.title || '',
        description: task.description || '',
        due_date: dueDate,
        due_time: dueTime,
        priority: task.priority || 'medium',
        status: task.status || 'pending',
        assigned_to: task.assigned_to || 'none',
      });
    }
  }, [task, open, form]);

  const onSubmit = async (data: EditTaskFormData) => {
    if (!task) return;

    // Combinar data e hora se ambos estiverem preenchidos
    let dueDateTime = null;
    if (data.due_date) {
      if (data.due_time) {
        dueDateTime = new Date(`${data.due_date}T${data.due_time}`).toISOString();
      } else {
        dueDateTime = new Date(`${data.due_date}T00:00:00`).toISOString();
      }
    }

    const updateData = {
      id: task.id,
      title: data.title,
      description: data.description || null,
      due_date: dueDateTime,
      priority: data.priority,
      status: data.status,
      assigned_to: data.assigned_to === 'none' ? null : data.assigned_to,
      completed_at: data.status === 'completed' ? new Date().toISOString() : null,
    };

    await updateTask.mutateAsync(updateData);
    onOpenChange(false);
  };

  const priorityLabels = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente',
  };

  const statusLabels = {
    pending: 'Pendente',
    in_progress: 'Em Progresso',
    completed: 'Concluída',
    cancelled: 'Cancelada',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Tarefa</DialogTitle>
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

            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável</FormLabel>
                  <FormControl>
                    <Select value={field.value || 'none'} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem responsável</SelectItem>
                        {workspaceMembers.map((member) => (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            {member.profiles?.full_name} ({member.profiles?.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([value, label]) => (
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
              <Button type="submit" disabled={updateTask.isPending}>
                {updateTask.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
