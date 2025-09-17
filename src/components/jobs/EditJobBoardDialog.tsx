
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
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
import { useUpdateJobBoard, JobBoard } from '@/hooks/useJobs';

interface EditJobBoardDialogProps {
  board: JobBoard;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BoardFormData {
  name: string;
  description: string;
  color: string;
}

const colors = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', 
  '#f59e0b', '#ef4444', '#84cc16', '#f97316',
  '#6366f1', '#14b8a6', '#f43f5e', '#8b5cf6'
];

export default function EditJobBoardDialog({ board, open, onOpenChange }: EditJobBoardDialogProps) {
  const { register, handleSubmit, reset, formState: { errors }, watch, setValue } = useForm<BoardFormData>();
  const updateBoard = useUpdateJobBoard();
  const selectedColor = watch('color');

  useEffect(() => {
    if (board && open) {
      reset({
        name: board.name,
        description: board.description || '',
        color: board.color,
      });
    }
  }, [board, open, reset]);

  const onSubmit = async (data: BoardFormData) => {
    await updateBoard.mutateAsync({
      id: board.id,
      name: data.name,
      description: data.description || null,
      color: data.color,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Board</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do Board *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Nome é obrigatório' })}
              placeholder="Ex: Desenvolvimento, Marketing..."
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Descrição do board..."
              rows={2}
            />
          </div>

          <div>
            <Label>Cor do Board</Label>
            <div className="grid grid-cols-6 gap-2 mt-2">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue('color', color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedColor === color ? 'border-gray-900 scale-110' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
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
              disabled={updateBoard.isPending}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {updateBoard.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
