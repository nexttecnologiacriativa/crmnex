import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useWorkspaceSettings, useUpdateWorkspaceSettings } from '@/hooks/useWorkspaceSettings';
import { usePipelines } from '@/hooks/usePipeline';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Brain, Sparkles, Filter, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AISettingsProps {
  currentUserRole?: string;
}

export default function AISettings({ currentUserRole }: AISettingsProps) {
  const { currentWorkspace } = useWorkspace();
  const { data: settings } = useWorkspaceSettings();
  const { mutate: updateSettings, isPending } = useUpdateWorkspaceSettings();
  const { data: pipelines } = usePipelines(currentWorkspace?.id);
  const [selectedPipelines, setSelectedPipelines] = useState<string[]>([]);

  // Update local state when settings change
  useEffect(() => {
    if (settings) {
      setSelectedPipelines(settings.ai_insights_pipeline_ids || []);
    }
  }, [settings]);

  const handlePipelineToggle = (pipelineId: string, checked: boolean) => {
    if (checked) {
      setSelectedPipelines(prev => [...prev, pipelineId]);
    } else {
      setSelectedPipelines(prev => prev.filter(id => id !== pipelineId));
    }
  };

  const handleSave = () => {
    updateSettings({
      ai_insights_pipeline_ids: selectedPipelines.length > 0 ? selectedPipelines : null
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="h-5 w-5 text-blue-600" />
                Configurações de IA
                <Badge variant="outline" className="text-xs bg-green-100 text-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Ativa
                </Badge>
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                A IA está ativa e pronta para gerar insights. Selecione os pipelines que deseja incluir na análise.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">

          {/* Pipeline Selection */}
          {pipelines && pipelines.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-blue-600" />
                <Label className="text-sm font-medium">
                  Pipelines para Análise de IA
                </Label>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Selecione quais pipelines incluir na análise dos insights de IA. Se nenhum for selecionado, todos os pipelines serão incluídos.
              </p>
              
              <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-3">
                {pipelines.map((pipeline) => (
                  <div key={pipeline.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`pipeline-${pipeline.id}`}
                      checked={selectedPipelines.includes(pipeline.id)}
                      onCheckedChange={(checked) => 
                        handlePipelineToggle(pipeline.id, checked as boolean)
                      }
                    />
                    <Label 
                      htmlFor={`pipeline-${pipeline.id}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {pipeline.name}
                      {pipeline.description && (
                        <span className="text-xs text-gray-500 block">
                          {pipeline.description}
                        </span>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
              
              {selectedPipelines.length > 0 && (
                <p className="text-xs text-blue-600">
                  {selectedPipelines.length} pipeline(s) selecionado(s) para análise
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={isPending}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isPending ? 'Salvando...' : 'Salvar Pipelines'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Features Card */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Recursos de IA Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-purple-600 mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium text-sm">Insights Automáticos do Dashboard</p>
                <p className="text-xs text-gray-600">
                  Análise inteligente dos seus dados de leads e conversões dos últimos 30 dias dos pipelines selecionados
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium text-sm">Recomendações Acionáveis</p>
                <p className="text-xs text-gray-600">
                  Sugestões específicas para melhorar a performance do seu pipeline de vendas
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-600 mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium text-sm">Identificação de Tendências</p>
                <p className="text-xs text-gray-600">
                  Detecção automática de padrões e oportunidades nos seus dados
                </p>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}