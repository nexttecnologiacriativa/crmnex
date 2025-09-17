
import { useState } from 'react';
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

interface AddJobColumnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (label: string, color: string) => void;
}

interface ColumnFormData {
  label: string;
  color: string;
}

const availableColors = [
  '#6b7280', '#3b82f6', '#f59e0b', '#10b981',
  '#ef4444', '#8b5cf6', '#06b6d4', '#f97316',
  '#84cc16', '#f43f5e', '#14b8a6', '#6366f1'
];

export default function AddJobColumnDialog({ open, onOpenChange, onSave }: AddJobColumnDialogProps) {
  const { register, handleSubmit, reset, formState: { errors }, watch, setValue } = useForm<ColumnFormData>({
    defaultValues: {
      color: availableColors[0],
    }
  });
  const selectedColor = watch('color');

  const onSubmit = async (data: ColumnFormData) => {
    onSave(data.label, data.color);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Nova Coluna</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="label">Nome da Coluna *</Label>
            <Input
              id="label"
              {...register('label', { required: 'Nome é obrigatório' })}
              placeholder="Ex: Em Teste, Aguardando Aprovação..."
            />
            {errors.label && (
              <p className="text-sm text-red-600 mt-1">{errors.label.message}</p>
            )}
          </div>

          <div>
            <Label>Cor da Coluna</Label>
            <div className="grid grid-cols-6 gap-2 mt-2">
              {availableColors.map((color) => (
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
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              Adicionar Coluna
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
