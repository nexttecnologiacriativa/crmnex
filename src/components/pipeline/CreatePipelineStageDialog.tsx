
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreatePipelineStage } from '@/hooks/usePipeline';

interface CreatePipelineStageDialogProps {
  pipelineId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nextPosition: number;
}

export default function CreatePipelineStageDialog({
  pipelineId,
  open,
  onOpenChange,
  nextPosition
}: CreatePipelineStageDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const createStage = useCreatePipelineStage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await createStage.mutateAsync({
      pipeline_id: pipelineId,
      name: name.trim(),
      color,
      position: nextPosition
    });

    setName('');
    setColor('#3b82f6');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Etapa</DialogTitle>
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
            <div className="flex items-center gap-2">
              <Input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-16 h-10"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#3b82f6"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createStage.isPending}>
              {createStage.isPending ? 'Criando...' : 'Criar Etapa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
