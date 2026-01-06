import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MessageSquare, UserPlus, AlertCircle } from 'lucide-react';
import { useWorkspaceSettings, useUpdateWorkspaceSettings } from '@/hooks/useWorkspaceSettings';
import { usePipelines, usePipelineStages } from '@/hooks/usePipeline';
import { useWorkspace } from '@/hooks/useWorkspace';
import { toast } from 'sonner';

interface WhatsAppAutoLeadSettingsProps {
  currentUserRole?: 'admin' | 'manager' | 'user';
}

export default function WhatsAppAutoLeadSettings({ currentUserRole }: WhatsAppAutoLeadSettingsProps) {
  const { currentWorkspace } = useWorkspace();
  const { data: settings, isLoading } = useWorkspaceSettings();
  const updateSettings = useUpdateWorkspaceSettings();
  const { data: pipelines = [] } = usePipelines(currentWorkspace?.id);
  
  const [autoCreateLead, setAutoCreateLead] = useState(false);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  
  const { data: stages = [] } = usePipelineStages(selectedPipelineId || '');
  
  const isAllowedToEdit = currentUserRole === 'admin';

  useEffect(() => {
    if (settings) {
      setAutoCreateLead((settings as any).auto_create_lead_from_whatsapp || false);
      setSelectedPipelineId((settings as any).default_whatsapp_pipeline_id || null);
      setSelectedStageId((settings as any).default_whatsapp_stage_id || null);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!isAllowedToEdit) {
      toast.error('Você não tem permissão para alterar estas configurações');
      return;
    }

    if (autoCreateLead && (!selectedPipelineId || !selectedStageId)) {
      toast.error('Selecione um pipeline e uma etapa para criar leads automaticamente');
      return;
    }

    try {
      await updateSettings.mutateAsync({
        auto_create_lead_from_whatsapp: autoCreateLead,
        default_whatsapp_pipeline_id: selectedPipelineId,
        default_whatsapp_stage_id: selectedStageId,
      } as any);
    } catch (error) {
      // Error handling in hook
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Criação Automática de Lead
        </CardTitle>
        <CardDescription>
          Configure a criação automática de leads quando novos contatos chegarem pelo WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isAllowedToEdit && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <p className="text-sm text-amber-800">
              Apenas administradores podem alterar estas configurações.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <Label className="text-base font-medium">
              Criar lead automaticamente
            </Label>
            <p className="text-sm text-muted-foreground">
              Quando um novo contato enviar mensagem pelo WhatsApp, um lead será criado automaticamente
            </p>
          </div>
          <Switch
            checked={autoCreateLead}
            onCheckedChange={setAutoCreateLead}
            disabled={!isAllowedToEdit}
          />
        </div>

        {autoCreateLead && (
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              Configurações do lead criado automaticamente
            </div>

            <div className="space-y-2">
              <Label>Pipeline</Label>
              <Select 
                value={selectedPipelineId || ''} 
                onValueChange={setSelectedPipelineId}
                disabled={!isAllowedToEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Etapa inicial</Label>
              <Select 
                value={selectedStageId || ''} 
                onValueChange={setSelectedStageId}
                disabled={!isAllowedToEdit || !selectedPipelineId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma etapa" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                💡 O lead será atribuído ao usuário configurado para receber novos contatos 
                na instância WhatsApp correspondente.
              </p>
            </div>
          </div>
        )}

        {isAllowedToEdit && (
          <Button 
            onClick={handleSave} 
            disabled={updateSettings.isPending}
            className="w-full"
          >
            {updateSettings.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Salvar Configurações
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
