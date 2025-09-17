
import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useUpdateJob, Job, JobPriority, useWorkspaceMembers, useJobBoards } from '@/hooks/useJobs';
import { useJobCustomStatuses } from '@/hooks/useJobCustomStatuses';

interface EditJobDialogProps {
  job: Job;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface JobFormData {
  title: string;
  description: string;
  priority: JobPriority;
  assigned_to: string;
  due_date: string;
  estimated_hours: number;
  actual_hours: number;
  board_id: string;
  status: string;
}

export default function EditJobDialog({ job, open, onOpenChange }: EditJobDialogProps) {
  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm<JobFormData>();
  const updateJob = useUpdateJob();
  const { data: workspaceMembers = [] } = useWorkspaceMembers();
  const { data: boards = [] } = useJobBoards();
  const { data: customStatuses = [] } = useJobCustomStatuses();
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (job && open) {
      reset({
        title: job.title,
        description: job.description || '',
        priority: job.priority,
        assigned_to: job.assigned_to || '',
        due_date: job.due_date ? new Date(job.due_date).toISOString().slice(0, 16) : '',
        estimated_hours: job.estimated_hours || 0,
        actual_hours: job.actual_hours || 0,
        board_id: job.board_id || '',
        status: job.status || 'todo',
      });
      setTags(job.tags || []);
    }
  }, [job, open, reset]);

  const onSubmit = async (data: JobFormData) => {
    await updateJob.mutateAsync({
      id: job.id,
      title: data.title,
      description: data.description || null,
      priority: data.priority,
      assigned_to: data.assigned_to || null,
      due_date: data.due_date || null,
      estimated_hours: data.estimated_hours || null,
      actual_hours: data.actual_hours || null,
      board_id: data.board_id || null,
      status: data.status,
      tags,
    });

    onOpenChange(false);
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Job</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                {...register('title', { required: 'Título é obrigatório' })}
                placeholder="Título do job"
              />
              {errors.title && (
                <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Descrição detalhada do job"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="board_id">Board</Label>
              <select
                id="board_id"
                {...register('board_id')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Sem board específico</option>
                {boards.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                {...register('status')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="todo">A Fazer</option>
                <option value="in_progress">Em Progresso</option>
                <option value="review">Em Revisão</option>
                <option value="done">Concluído</option>
                {customStatuses.map((status) => (
                  <option key={status.status_id} value={status.status_id}>
                    {status.status_label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="priority">Prioridade</Label>
              <select
                id="priority"
                {...register('priority')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>

            <div>
              <Label htmlFor="assigned_to">Responsável</Label>
              <select
                id="assigned_to"
                {...register('assigned_to')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Selecione um responsável</option>
                {workspaceMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name} ({member.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="due_date">Data de Vencimento</Label>
              <Input
                id="due_date"
                type="datetime-local"
                {...register('due_date')}
              />
            </div>

            <div>
              <Label htmlFor="estimated_hours">Horas Estimadas</Label>
              <Input
                id="estimated_hours"
                type="number"
                step="0.5"
                min="0"
                {...register('estimated_hours')}
                placeholder="Ex: 8"
              />
            </div>

            <div>
              <Label htmlFor="actual_hours">Horas Gastas</Label>
              <Input
                id="actual_hours"
                type="number"
                step="0.5"
                min="0"
                {...register('actual_hours')}
                placeholder="Ex: 6.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="tags">Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleTagKeyPress}
                placeholder="Digite uma tag e pressione Enter"
              />
              <Button type="button" onClick={addTag} variant="outline">
                Adicionar
              </Button>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={updateJob.isPending}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {updateJob.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
