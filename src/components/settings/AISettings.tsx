import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useWorkspaceSettings, useUpdateWorkspaceSettings } from '@/hooks/useWorkspaceSettings';
import { usePipelines } from '@/hooks/usePipeline';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Eye, EyeOff, Brain, Sparkles, Filter } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AISettingsProps {
  currentUserRole?: string;
}

export default function AISettings({ currentUserRole }: AISettingsProps) {
  const { currentWorkspace } = useWorkspace();
  const { data: settings } = useWorkspaceSettings();
  const { mutate: updateSettings, isPending } = useUpdateWorkspaceSettings();
  const { data: pipelines } = usePipelines(currentWorkspace?.id);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [selectedPipelines, setSelectedPipelines] = useState<string[]>([]);

  const isDisabled = currentUserRole !== 'admin' && currentUserRole !== 'manager';

  // Update local state when settings change
  useEffect(() => {
    if (settings) {
      setApiKey(settings.openai_api_key || '');
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
    if (!apiKey.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira uma API key válida",
        variant: "destructive",
      });
      return;
    }

    updateSettings({
      openai_api_key: apiKey.trim(),
      ai_insights_pipeline_ids: selectedPipelines.length > 0 ? selectedPipelines : null
    });
  };

  const handleClear = () => {
    setApiKey('');
    setSelectedPipelines([]);
    updateSettings({
      openai_api_key: null,
      ai_insights_pipeline_ids: null
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-blue-600" />
            Configurações de IA
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Configure a integração com OpenAI para receber insights inteligentes sobre seus dados do CRM.
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* OpenAI API Key */}
          <div className="space-y-3">
            <Label htmlFor="openai-api-key" className="text-sm font-medium">
              OpenAI API Key
            </Label>
            <div className="relative">
              <Input
                id="openai-api-key"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="pr-10"
                disabled={isDisabled}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowApiKey(!showApiKey)}
                disabled={isDisabled}
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Sua API key será criptografada e armazenada com segurança. 
              Você pode obter uma em{' '}
              <a 
                href="https://platform.openai.com/api-keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                platform.openai.com/api-keys
              </a>
            </p>
          </div>

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
                      disabled={isDisabled}
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
          {!isDisabled && (
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={isPending || !apiKey.trim()}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isPending ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
              {settings?.openai_api_key && (
                <Button
                  variant="outline"
                  onClick={handleClear}
                  disabled={isPending}
                >
                  Remover API Key
                </Button>
              )}
            </div>
          )}

          {isDisabled && (
            <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
              Apenas administradores e gerentes podem configurar as integrações de IA.
            </div>
          )}
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
                  Análise inteligente dos seus dados de leads, tarefas e conversões dos últimos 30 dias dos pipelines selecionados
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