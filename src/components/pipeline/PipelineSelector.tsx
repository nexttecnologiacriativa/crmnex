import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Settings, Star, Trash2 } from 'lucide-react';
import { usePipelines, useDeletePipeline } from '@/hooks/usePipeline';
import { useEnsureDefaultWorkspace } from '@/hooks/useWorkspace';
import { useWorkspaceSettings, useUpdateWorkspaceSettings } from '@/hooks/useWorkspaceSettings';
import CreatePipelineDialog from './CreatePipelineDialog';
import EditPipelineDialog from './EditPipelineDialog';

interface PipelineSelectorProps {
  selectedPipelineId: string | null;
  onPipelineChange: (pipelineId: string | null) => void;
}

export default function PipelineSelector({ selectedPipelineId, onPipelineChange }: PipelineSelectorProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<any>(null);
  const { workspace } = useEnsureDefaultWorkspace();
  const { data: pipelines = [] } = usePipelines(workspace?.id);
  const { data: workspaceSettings } = useWorkspaceSettings();
  const updateWorkspaceSettings = useUpdateWorkspaceSettings();
  const deletePipeline = useDeletePipeline();

  // Remover auto-seleção daqui pois já é feita na página Pipeline
  // Isso evita conflito quando o usuário quer trocar de pipeline

  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId);

  const handlePipelineSelect = (pipelineId: string) => {
    onPipelineChange(pipelineId);
  };

  const handleSetAsDefault = async (pipelineId: string) => {
    await updateWorkspaceSettings.mutateAsync({
      default_pipeline_id: pipelineId
    });
  };

  const handleDeletePipeline = async (pipelineId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este pipeline? Esta ação não pode ser desfeita.')) {
      await deletePipeline.mutateAsync(pipelineId);
      // Se o pipeline excluído era o selecionado, limpar seleção
      if (selectedPipelineId === pipelineId) {
        onPipelineChange(null);
      }
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <Select value={selectedPipelineId || ''} onValueChange={handlePipelineSelect}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder="Selecione um pipeline" />
          </SelectTrigger>
          <SelectContent>
            {pipelines.map((pipeline) => (
              <SelectItem key={pipeline.id} value={pipeline.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{pipeline.name}</span>
                  {workspaceSettings?.default_pipeline_id === pipeline.id && (
                    <Star className="h-3 w-3 text-yellow-500 ml-2" />
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => selectedPipeline && handleSetAsDefault(selectedPipeline.id)}
          disabled={!selectedPipeline || workspaceSettings?.default_pipeline_id === selectedPipeline?.id}
        >
          <Star className="h-4 w-4 mr-1" />
          Definir Padrão
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditingPipeline(selectedPipeline)}
          disabled={!selectedPipeline}
        >
          <Settings className="h-4 w-4 mr-1" />
          Editar
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => selectedPipeline && handleDeletePipeline(selectedPipeline.id)}
          disabled={!selectedPipeline || pipelines.length <= 1}
          className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Excluir
        </Button>

        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="gradient-premium text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Pipeline
        </Button>
      </div>

      <CreatePipelineDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {editingPipeline && (
        <EditPipelineDialog
          open={!!editingPipeline}
          onOpenChange={(open) => !open && setEditingPipeline(null)}
          pipeline={editingPipeline}
        />
      )}
    </div>
  );
}