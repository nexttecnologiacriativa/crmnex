
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdatePipelineStage } from '@/hooks/usePipeline';

interface EditPipelineStageDialogProps {
  stage: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const predefinedColors = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
  '#8b5cf6', '#ec4899', '#6b7280', '#14b8a6'
];

export default function EditPipelineStageDialog({ 
  stage, 
  open, 
  onOpenChange
}: EditPipelineStageDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const updateStage = useUpdatePipelineStage();

  useEffect(() => {
    if (stage && open) {
      setName(stage.name || '');
      setColor(stage.color || '#3b82f6');
    }
  }, [stage, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stage || !name.trim()) return;

    await updateStage.mutateAsync({
      id: stage.id,
      name: name.trim(),
      color
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Etapa</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome da Etapa</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite o nome da etapa"
              required
            />
          </div>

          <div>
            <Label htmlFor="color">Cor</Label>
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2">
                {predefinedColors.map((presetColor) => (
                  <button
                    key={presetColor}
                    type="button"
                    onClick={() => setColor(presetColor)}
                    className={`w-8 h-8 rounded-full border-2 ${
                      color === presetColor ? 'border-gray-900' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: presetColor }}
                  />
                ))}
              </div>
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full h-10"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateStage.isPending}>
              {updateStage.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
