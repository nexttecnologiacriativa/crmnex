import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MessageSquare, UserPlus, AlertCircle, Phone, Tag, User } from 'lucide-react';
import { useAllWorkspaceInstances } from '@/hooks/useWhatsAppInstance';
import { useWhatsAppInstanceSettings, useUpdateInstanceSettings } from '@/hooks/useWhatsAppInstanceSettings';
import { usePipelines, usePipelineStages } from '@/hooks/usePipeline';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useWorkspaceMembers } from '@/hooks/useWhatsAppInstance';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface WhatsAppAutoLeadSettingsProps {
  currentUserRole?: 'admin' | 'manager' | 'user';
}

export default function WhatsAppAutoLeadSettings({ currentUserRole }: WhatsAppAutoLeadSettingsProps) {
  const { currentWorkspace } = useWorkspace();
  const { data: instances = [], isLoading: isLoadingInstances } = useAllWorkspaceInstances();
  const { data: members = [] } = useWorkspaceMembers();
  const { data: pipelines = [] } = usePipelines(currentWorkspace?.id);
  
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const { data: settings, isLoading: isLoadingSettings } = useWhatsAppInstanceSettings(selectedInstanceId);
  const updateSettings = useUpdateInstanceSettings();
  
  const [autoCreateLead, setAutoCreateLead] = useState(false);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [autoTagId, setAutoTagId] = useState<string | null>(null);
  
  const { data: stages = [] } = usePipelineStages(selectedPipelineId || '');
  
  // Buscar tags do workspace
  const { data: tags = [] } = useQuery({
    queryKey: ['lead-tags', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from('lead_tags')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace?.id,
  });

  const isAllowedToEdit = currentUserRole === 'admin';

  // Selecionar primeira instância por padrão
  useEffect(() => {
    if (instances.length > 0 && !selectedInstanceId) {
      setSelectedInstanceId(instances[0].id);
    }
  }, [instances, selectedInstanceId]);

  // Atualizar formulário quando as configurações forem carregadas
  useEffect(() => {
    if (settings) {
      setAutoCreateLead(settings.auto_create_lead || false);
      setSelectedPipelineId(settings.default_pipeline_id);
      setSelectedStageId(settings.default_stage_id);
      setAssignedTo(settings.assigned_to);
      setAutoTagId(settings.auto_tag_id);
    } else {
      // Reset para valores padrão quando não há configuração
      setAutoCreateLead(false);
      setSelectedPipelineId(null);
      setSelectedStageId(null);
      setAssignedTo(null);
      setAutoTagId(null);
    }
  }, [settings, selectedInstanceId]);

  // Reset stage quando pipeline muda
  useEffect(() => {
    if (selectedPipelineId && settings?.default_pipeline_id !== selectedPipelineId) {
      setSelectedStageId(null);
    }
  }, [selectedPipelineId, settings?.default_pipeline_id]);

  const handleSave = async () => {
    if (!isAllowedToEdit) {
      return;
    }

    if (!selectedInstanceId) {
      return;
    }

    if (autoCreateLead && (!selectedPipelineId || !selectedStageId)) {
      return;
    }

    await updateSettings.mutateAsync({
      instance_id: selectedInstanceId,
      auto_create_lead: autoCreateLead,
      default_pipeline_id: selectedPipelineId,
      default_stage_id: selectedStageId,
      assigned_to: assignedTo,
      auto_tag_id: autoTagId,
    });
  };

  const selectedInstance = instances.find(i => i.id === selectedInstanceId);

  if (isLoadingInstances) {
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

  if (instances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Leads WhatsApp
          </CardTitle>
          <CardDescription>
            Configure a criação automática de leads por número WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma instância WhatsApp configurada.</p>
            <p className="text-sm mt-2">Configure uma instância em Integrações → WhatsApp Evolution</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Leads WhatsApp
          </CardTitle>
          <CardDescription>
            Configure a criação automática de leads por número WhatsApp
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

          {/* Seletor de número */}
          <div className="space-y-2">
            <Label>Selecione um número</Label>
            <Select 
              value={selectedInstanceId || ''} 
              onValueChange={setSelectedInstanceId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma instância" />
              </SelectTrigger>
              <SelectContent>
                {instances.map((instance) => (
                  <SelectItem key={instance.id} value={instance.id}>
                    <div className="flex items-center gap-2">
                      <span>{instance.display_name || instance.instance_name}</span>
                      {instance.phone_number && (
                        <span className="text-muted-foreground">({instance.phone_number})</span>
                      )}
                      <Badge 
                        variant="outline" 
                        className={
                          instance.status === 'open' 
                            ? 'bg-green-100 text-green-800 border-green-200' 
                            : 'bg-gray-100 text-gray-600'
                        }
                      >
                        {instance.status === 'open' ? 'Conectado' : instance.status}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedInstanceId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Configurações para: {selectedInstance?.display_name || selectedInstance?.instance_name}
              {selectedInstance?.phone_number && (
                <span className="text-muted-foreground font-normal">
                  ({selectedInstance.phone_number})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingSettings ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <>
                {/* Toggle de criação automática */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">
                      Criar lead automaticamente
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Quando um novo contato enviar mensagem por este número, um lead será criado
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
                    {/* Pipeline e Etapa */}
                    <div className="grid gap-4 md:grid-cols-2">
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
                    </div>

                    {/* Atribuição */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Atribuir para
                      </Label>
                      <Select 
                        value={assignedTo || ''} 
                        onValueChange={(v) => setAssignedTo(v || null)}
                        disabled={!isAllowedToEdit}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um usuário (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Não atribuir automaticamente</SelectItem>
                          {members.map((member) => (
                            <SelectItem key={member.user_id} value={member.user_id}>
                              {member.profiles?.full_name || member.profiles?.email || 'Usuário'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        O lead será atribuído automaticamente a este usuário
                      </p>
                    </div>

                    {/* Tag automática */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Tag automática
                      </Label>
                      <Select 
                        value={autoTagId || ''} 
                        onValueChange={(v) => setAutoTagId(v || null)}
                        disabled={!isAllowedToEdit}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma tag (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nenhuma tag</SelectItem>
                          {tags.map((tag) => (
                            <SelectItem key={tag.id} value={tag.id}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: tag.color }}
                                />
                                {tag.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Esta tag será aplicada automaticamente ao lead criado
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <p className="text-sm text-blue-800">
                        💡 Quando um novo contato enviar mensagem por este número, o lead será criado com as configurações acima.
                      </p>
                    </div>
                  </div>
                )}

                {isAllowedToEdit && (
                  <Button 
                    onClick={handleSave} 
                    disabled={updateSettings.isPending || (autoCreateLead && (!selectedPipelineId || !selectedStageId))}
                    className="w-full"
                  >
                    {updateSettings.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Salvar Configurações
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
