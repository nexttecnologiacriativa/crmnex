
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdatePipeline, useDeletePipeline } from '@/hooks/usePipeline';
import { useEnsureDefaultWorkspace } from '@/hooks/useWorkspace';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';

interface EditPipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline: any;
}

interface PipelineFormData {
  name: string;
  description: string;
  default_assignee: string;
  default_value: string;
}

export default function EditPipelineDialog({ open, onOpenChange, pipeline }: EditPipelineDialogProps) {
  const { workspace } = useEnsureDefaultWorkspace();
  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm<PipelineFormData>();
  const updatePipeline = useUpdatePipeline();
  const deletePipeline = useDeletePipeline();

  // Buscar membros do workspace
  const { data: workspaceMembers = [] } = useQuery({
    queryKey: ['workspace-members', workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      
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
        .eq('workspace_id', workspace.id);

      if (error) {
        console.error('Erro ao buscar membros do workspace:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!workspace?.id,
  });

  const selectedAssignee = watch('default_assignee');

  useEffect(() => {
    if (pipeline && open) {
      console.log('Pipeline debug - Full pipeline object:', JSON.stringify(pipeline, null, 2));
      console.log('Pipeline debug - is_default value:', pipeline.is_default);
      console.log('Pipeline debug - is_default type:', typeof pipeline.is_default);
      console.log('Pipeline debug - Should show delete button:', pipeline.is_default !== true);
      
      reset({
        name: pipeline.name || '',
        description: pipeline.description || '',
        default_assignee: pipeline.default_assignee || 'none',
        default_value: pipeline.default_value ? pipeline.default_value.toString() : '',
      });
    }
  }, [pipeline, open, reset]);

  const onSubmit = async (data: PipelineFormData) => {
    if (!pipeline?.id) return;

    try {
      await updatePipeline.mutateAsync({
        id: pipeline.id,
        name: data.name,
        description: data.description || null,
        default_assignee: data.default_assignee === 'none' ? null : data.default_assignee,
        default_value: data.default_value ? parseFloat(data.default_value) : null,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error updating pipeline:', error);
    }
  };

  const handleDelete = async () => {
    if (!pipeline?.id) return;
    
    try {
      await deletePipeline.mutateAsync(pipeline.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting pipeline:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Pipeline</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Nome é obrigatório' })}
              placeholder="Nome do pipeline"
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
              placeholder="Descrição do pipeline"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="default_value">Valor Padrão (R$)</Label>
            <Input
              id="default_value"
              type="number"
              step="0.01"
              min="0"
              {...register('default_value')}
              placeholder="0,00"
            />
            <p className="text-xs text-gray-500 mt-1">
              Valor em reais que será atribuído automaticamente aos leads que entrarem neste pipeline
            </p>
          </div>

          <div>
            <Label htmlFor="default_assignee">Responsável Padrão</Label>
            <Select 
              value={selectedAssignee || 'none'} 
              onValueChange={(value) => setValue('default_assignee', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um responsável padrão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem responsável padrão</SelectItem>
                {workspaceMembers.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.profiles?.full_name} ({member.profiles?.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Todos os leads que entrarem neste pipeline serão atribuídos a este responsável automaticamente
            </p>
          </div>

          <div className="flex justify-between items-center pt-4">
            <div className="flex space-x-2">
              {pipeline && pipeline.is_default !== true && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir Pipeline
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir Pipeline</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir este pipeline? Todos os leads serão movidos para o pipeline padrão. Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={updatePipeline.isPending}
              >
                {updatePipeline.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
