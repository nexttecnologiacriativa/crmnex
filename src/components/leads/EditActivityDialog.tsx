
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateLeadActivity, useDeleteLeadActivity } from '@/hooks/useLeadActivities';
import { Trash2 } from 'lucide-react';

interface Activity {
  id: string;
  lead_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  created_at: string;
}

interface EditActivityDialogProps {
  activity: Activity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const activityTypes = [
  { value: 'note', label: 'Anotação' },
  { value: 'call', label: 'Ligação' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Reunião' },
  { value: 'status_change', label: 'Mudança de Status' },
];

export default function EditActivityDialog({ activity, open, onOpenChange }: EditActivityDialogProps) {
  const [title, setTitle] = useState(activity.title);
  const [description, setDescription] = useState(activity.description || '');
  const [activityType, setActivityType] = useState(activity.activity_type);

  const updateActivity = useUpdateLeadActivity();
  const deleteActivity = useDeleteLeadActivity();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateActivity.mutateAsync({
        id: activity.id,
        title,
        description,
        activity_type: activityType,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao atualizar atividade:', error);
    }
  };

  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja excluir esta atividade?')) {
      try {
        await deleteActivity.mutateAsync(activity.id);
        onOpenChange(false);
      } catch (error) {
        console.error('Erro ao excluir atividade:', error);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Atividade</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="activity-type">Tipo de Atividade</Label>
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {activityTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da atividade"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição da atividade"
              rows={4}
            />
          </div>

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteActivity.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleteActivity.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateActivity.isPending}
                className="gradient-premium text-white"
              >
                {updateActivity.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
