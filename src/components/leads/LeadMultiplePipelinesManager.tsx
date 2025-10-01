import { useState } from 'react';
import { Plus, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePipelines, usePipelineStages } from '@/hooks/usePipeline';
import {
  useLeadPipelineRelations,
  useAddLeadToPipeline,
  useRemoveLeadFromPipeline,
  useSetPrimaryPipeline,
} from '@/hooks/useLeadPipelineRelations';

interface LeadMultiplePipelinesManagerProps {
  leadId: string;
  workspaceId: string;
}

export default function LeadMultiplePipelinesManager({
  leadId,
  workspaceId,
}: LeadMultiplePipelinesManagerProps) {
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [selectedStageId, setSelectedStageId] = useState<string>('');

  const { data: pipelines } = usePipelines(workspaceId);
  const { data: stages } = usePipelineStages(selectedPipelineId);
  const { data: relations } = useLeadPipelineRelations(leadId);
  const addToPipeline = useAddLeadToPipeline();
  const removeFromPipeline = useRemoveLeadFromPipeline();
  const setPrimary = useSetPrimaryPipeline();

  const handleAddToPipeline = async () => {
    if (!selectedPipelineId || !selectedStageId) return;

    await addToPipeline.mutateAsync({
      lead_id: leadId,
      pipeline_id: selectedPipelineId,
      stage_id: selectedStageId,
      is_primary: relations?.length === 0, // Primeiro pipeline é sempre primário
    });

    setSelectedPipelineId('');
    setSelectedStageId('');
  };

  const handleSetPrimary = async (pipelineId: string) => {
    await setPrimary.mutateAsync({
      lead_id: leadId,
      pipeline_id: pipelineId,
    });
  };

  const handleRemove = async (pipelineId: string) => {
    const relation = relations?.find((r) => r.pipeline_id === pipelineId);
    if (relation?.is_primary && relations && relations.length > 1) {
      alert('Não é possível remover o pipeline principal. Defina outro pipeline como principal primeiro.');
      return;
    }

    await removeFromPipeline.mutateAsync({
      lead_id: leadId,
      pipeline_id: pipelineId,
    });
  };

  const availablePipelines = pipelines?.filter(
    (p) => !relations?.some((r) => r.pipeline_id === p.id)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipelines do Lead</CardTitle>
        <CardDescription>
          Gerencie em quais pipelines este lead aparece
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lista de pipelines atuais */}
        <div className="space-y-2">
          {relations?.map((relation: any) => (
            <div
              key={relation.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3 flex-1">
                {relation.is_primary && (
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{relation.pipelines?.name}</span>
                    {relation.is_primary && (
                      <Badge variant="secondary" className="text-xs">
                        Principal
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: relation.pipeline_stages?.color }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {relation.pipeline_stages?.name}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!relation.is_primary && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetPrimary(relation.pipeline_id)}
                    title="Definir como principal"
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(relation.pipeline_id)}
                  disabled={relation.is_primary && relations.length === 1}
                  title="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Adicionar novo pipeline */}
        {availablePipelines && availablePipelines.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <p className="text-sm font-medium">Adicionar a outro pipeline</p>
            <div className="flex gap-2">
              <Select
                value={selectedPipelineId}
                onValueChange={(value) => {
                  setSelectedPipelineId(value);
                  setSelectedStageId('');
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione o pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {availablePipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedStageId}
                onValueChange={setSelectedStageId}
                disabled={!selectedPipelineId}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione o estágio" />
                </SelectTrigger>
                <SelectContent>
                  {stages?.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={handleAddToPipeline}
                disabled={!selectedPipelineId || !selectedStageId || addToPipeline.isPending}
                size="icon"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
