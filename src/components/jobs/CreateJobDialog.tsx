
import { useForm } from 'react-hook-form';
import { useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { useCreateJob, JobPriority, JobStatus, useWorkspaceMembers, useJobBoards } from '@/hooks/useJobs';

interface CreateJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStatus?: JobStatus;
  defaultBoardId?: string | null;
}

interface JobFormData {
  title: string;
  description: string;
  priority: JobPriority;
  assigned_to: string;
  due_date: string;
  estimated_hours: number;
  board_id: string;
}

export default function CreateJobDialog({ open, onOpenChange, defaultStatus = 'todo', defaultBoardId }: CreateJobDialogProps) {
  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm<JobFormData>({
    defaultValues: {
      priority: 'medium',
      assigned_to: 'none',
      board_id: defaultBoardId || 'none'
    }
  });
  const createJob = useCreateJob();
  const { data: workspaceMembers = [] } = useWorkspaceMembers();
  const { data: boards = [] } = useJobBoards();
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const watchedValues = watch();

  const onSubmit = async (data: JobFormData) => {
    await createJob.mutateAsync({
      title: data.title,
      description: data.description || null,
      priority: data.priority,
      assigned_to: data.assigned_to === 'none' ? null : data.assigned_to,
      due_date: data.due_date || null,
      estimated_hours: data.estimated_hours || null,
      board_id: data.board_id === 'none' ? null : data.board_id,
      status: defaultStatus,
      tags,
    });

    reset();
    setTags([]);
    setTagInput('');
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
          <DialogTitle>Criar Novo Job</DialogTitle>
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
              <Select value={watchedValues.board_id} onValueChange={(value) => setValue('board_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um board" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem board específico</SelectItem>
                  {boards.map((board) => (
                    <SelectItem key={board.id} value={board.id}>
                      {board.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Prioridade</Label>
              <Select value={watchedValues.priority} onValueChange={(value) => setValue('priority', value as JobPriority)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="assigned_to">Responsável</Label>
              <Select value={watchedValues.assigned_to} onValueChange={(value) => setValue('assigned_to', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não atribuído</SelectItem>
                  {workspaceMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name} ({member.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              disabled={createJob.isPending}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {createJob.isPending ? 'Criando...' : 'Criar Job'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
