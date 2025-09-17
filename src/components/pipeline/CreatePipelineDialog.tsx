
import { useState } from 'react';
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
import { useCreatePipeline } from '@/hooks/usePipeline';
import { useEnsureDefaultWorkspace } from '@/hooks/useWorkspace';

interface CreatePipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PipelineFormData {
  name: string;
  description: string;
  default_assignee: string;
  default_value: string;
}

export default function CreatePipelineDialog({ open, onOpenChange }: CreatePipelineDialogProps) {
  const { workspace } = useEnsureDefaultWorkspace();
  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm<PipelineFormData>();
  const createPipeline = useCreatePipeline();

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

  const onSubmit = async (data: PipelineFormData) => {
    console.log('Submitting pipeline form:', data);
    console.log('Workspace:', workspace);
    
    if (!workspace?.id) {
      console.error('Missing workspaceId:', workspace);
      return;
    }

    try {
      await createPipeline.mutateAsync({
        workspace_id: workspace.id,
        name: data.name,
        description: data.description || null,
        default_assignee: data.default_assignee === 'none' ? null : data.default_assignee,
        default_value: data.default_value ? parseFloat(data.default_value) : null,
        is_default: false,
      });

      reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating pipeline:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Pipeline</DialogTitle>
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

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createPipeline.isPending || !workspace}
            >
              {createPipeline.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
