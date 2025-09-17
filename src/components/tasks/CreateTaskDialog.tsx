
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateTask } from '@/hooks/useTasks';
import { getLeadDisplayName } from '@/lib/leadUtils';
import { useLeads } from '@/hooks/useLeads';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TaskFormData {
  title: string;
  description: string;
  due_date: string;
  due_time: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  lead_id: string;
}

export default function CreateTaskDialog({ open, onOpenChange }: CreateTaskDialogProps) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TaskFormData>();
  const createTask = useCreateTask();
  const { data: leads = [] } = useLeads();

  const onSubmit = async (data: TaskFormData) => {
    if (!currentWorkspace?.id || !user) return;

    // Combinar data e hora se ambos estiverem preenchidos
    let dueDateTime = null;
    if (data.due_date) {
      if (data.due_time) {
        dueDateTime = new Date(`${data.due_date}T${data.due_time}`).toISOString();
      } else {
        dueDateTime = new Date(`${data.due_date}T00:00:00`).toISOString();
      }
    }

    await createTask.mutateAsync({
      workspace_id: currentWorkspace.id,
      assigned_to: user.id,
      created_by: user.id,
      title: data.title,
      description: data.description || null,
      due_date: dueDateTime,
      priority: data.priority,
      lead_id: data.lead_id || null,
      status: 'pending',
    });

    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              {...register('title', { required: 'Título é obrigatório' })}
              placeholder="Título da tarefa"
            />
            {errors.title && (
              <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Descrição da tarefa"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="due_date">Data de Vencimento</Label>
              <Input
                id="due_date"
                type="date"
                {...register('due_date')}
              />
            </div>
            <div>
              <Label htmlFor="due_time">Hora</Label>
              <Input
                id="due_time"
                type="time"
                {...register('due_time')}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="priority">Prioridade</Label>
            <select
              id="priority"
              {...register('priority')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>

          <div>
            <Label htmlFor="lead_id">Lead Relacionado</Label>
            <select
              id="lead_id"
              {...register('lead_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione um lead</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {getLeadDisplayName(lead)} - {lead.company}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
