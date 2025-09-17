import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, ExternalLink, Copy, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLeadTags } from '@/hooks/useLeadTags';
import { usePipelines } from '@/hooks/usePipeline';
import { useWorkspace } from '@/hooks/useWorkspace';
import { usePlatformIntegrations, useCreatePlatformIntegration, useUpdatePlatformIntegration, useDeletePlatformIntegration } from '@/hooks/usePlatformIntegrations';
import FormWebhookSettings from '@/components/settings/FormWebhookSettings';
import N8nWebhookSettings from '@/components/settings/N8nWebhookSettings';


interface IntegrationsSettingsProps {
  currentUserRole?: 'admin' | 'manager' | 'user';
}

export default function IntegrationsSettings({ currentUserRole }: IntegrationsSettingsProps) {
  const { toast } = useToast();
  const { currentWorkspace } = useWorkspace();
  const { data: tags } = useLeadTags();
  const { data: pipelines } = usePipelines(currentWorkspace?.id);
  
  // Hooks do banco de dados
  const { data: integrations = [], isLoading } = usePlatformIntegrations(currentWorkspace?.id);
  const createIntegrationMutation = useCreatePlatformIntegration();
  const updateIntegrationMutation = useUpdatePlatformIntegration();
  const deleteIntegrationMutation = useDeletePlatformIntegration();
  
  const [isCreating, setIsCreating] = useState(false);
  const [newIntegration, setNewIntegration] = useState({
    name: '',
    platform: '',
    selectedTagIds: [] as string[],
    selectedPipelineId: '',
  });

  const isAllowedToEdit = currentUserRole === 'admin' || currentUserRole === 'manager';

  const handleCreateIntegration = async () => {
    if (!newIntegration.name || !newIntegration.platform || newIntegration.selectedTagIds.length === 0 || !newIntegration.selectedPipelineId) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (!currentWorkspace?.id) {
      toast({
        title: "Erro",
        description: "Workspace não encontrado",
        variant: "destructive",
      });
      return;
    }

    try {
      await createIntegrationMutation.mutateAsync({
        workspace_id: currentWorkspace.id,
        name: newIntegration.name,
        platform: newIntegration.platform,
        selected_tag_ids: newIntegration.selectedTagIds,
        selected_pipeline_id: newIntegration.selectedPipelineId,
      });
      
      setNewIntegration({ name: '', platform: '', selectedTagIds: [], selectedPipelineId: '' });
      setIsCreating(false);
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleDeleteIntegration = async (id: string) => {
    try {
      await deleteIntegrationMutation.mutateAsync(id);
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleToggleIntegration = async (id: string) => {
    const integration = integrations.find(i => i.id === id);
    if (!integration) return;

    try {
      await updateIntegrationMutation.mutateAsync({
        id,
        is_active: !integration.is_active,
      });
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "URL copiada para a área de transferência",
    });
  };

  const getSelectedTagName = (tagId: string) => {
    const tag = tags?.find(t => t.id === tagId);
    return tag?.name || 'Tag não encontrada';
  };

  const getSelectedTagColor = (tagId: string) => {
    const tag = tags?.find(t => t.id === tagId);
    return tag?.color || '#6b7280';
  };

  const getSelectedPipelineName = (pipelineId: string) => {
    const pipeline = pipelines?.find(p => p.id === pipelineId);
    return pipeline?.name || 'Pipeline não encontrado';
  };

  const handleTagToggle = (tagId: string, checked: boolean) => {
    if (checked) {
      setNewIntegration({
        ...newIntegration,
        selectedTagIds: [...newIntegration.selectedTagIds, tagId]
      });
    } else {
      setNewIntegration({
        ...newIntegration,
        selectedTagIds: newIntegration.selectedTagIds.filter(id => id !== tagId)
      });
    }
  };

  const removeTag = (tagId: string) => {
    setNewIntegration({
      ...newIntegration,
      selectedTagIds: newIntegration.selectedTagIds.filter(id => id !== tagId)
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Integrações</h2>
        <p className="text-muted-foreground mt-2">
          Configure integrações com plataformas de vendas e webhooks para formulários externos.
        </p>
      </div>

      <Tabs defaultValue="platforms" className="space-y-6">
        <TabsList className="bg-white shadow-sm border">
          <TabsTrigger 
            value="platforms"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
          >
            Plataformas de Venda
          </TabsTrigger>
          <TabsTrigger 
            value="form-webhooks"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
          >
            Formulários Externos
          </TabsTrigger>
          <TabsTrigger 
            value="n8n-webhook"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
          >
            n8n Webhook
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="platforms" className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold">Integrações com Plataformas</h3>
            <p className="text-muted-foreground">
              Configure integrações com plataformas como Hotmart, Eduzz, Monetizze e outras para automatizar a criação e atualização de leads.
            </p>
          </div>

          {/* Lista de Integrações */}
          <div className="space-y-4">
            {integrations.map((integration) => (
              <Card key={integration.id}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <CardDescription>{integration.platform}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex gap-1 flex-wrap">
                        {integration.selected_tag_ids.map((tagId) => (
                          <Badge 
                            key={tagId}
                            variant="secondary" 
                            style={{ backgroundColor: `${getSelectedTagColor(tagId)}20`, color: getSelectedTagColor(tagId) }}
                          >
                            {getSelectedTagName(tagId)}
                          </Badge>
                        ))}
                      </div>
                      <Badge variant="outline">
                        {getSelectedPipelineName(integration.selected_pipeline_id)}
                      </Badge>
                      {isAllowedToEdit && (
                        <>
                          <Switch
                            checked={integration.is_active}
                            onCheckedChange={() => handleToggleIntegration(integration.id)}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteIntegration(integration.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">URL do Webhook</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          value={integration.webhook_url}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(integration.webhook_url)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>• Configure esta URL como webhook de venda na plataforma {integration.platform}</p>
                      <p>• Leads serão criados/atualizados automaticamente com as tags selecionadas</p>
                      <p>• Leads irão para o pipeline: <strong>{getSelectedPipelineName(integration.selected_pipeline_id)}</strong></p>
                      <p>• Status será marcado como "ganho" automaticamente</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {integrations.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">Nenhuma integração configurada ainda.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Criar Nova Integração */}
          {isAllowedToEdit && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Nova Integração
                </CardTitle>
                <CardDescription>
                  Configure uma nova integração com uma plataforma de vendas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isCreating ? (
                  <Button onClick={() => setIsCreating(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Integração
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="integration-name">Nome da Integração *</Label>
                        <Input
                          id="integration-name"
                          placeholder="Ex: Hotmart Produto X"
                          value={newIntegration.name}
                          onChange={(e) => setNewIntegration({ ...newIntegration, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="platform-select">Plataforma *</Label>
                        <Select
                          value={newIntegration.platform}
                          onValueChange={(value) => setNewIntegration({ ...newIntegration, platform: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a plataforma" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hotmart">Hotmart</SelectItem>
                            <SelectItem value="eduzz">Eduzz</SelectItem>
                            <SelectItem value="monetizze">Monetizze</SelectItem>
                            <SelectItem value="kiwify">Kiwify</SelectItem>
                            <SelectItem value="perfectpay">PerfectPay</SelectItem>
                            <SelectItem value="braip">Braip</SelectItem>
                            <SelectItem value="autre">Outra</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="tag-select">Tags para Leads *</Label>
                        <div className="space-y-2 mt-2">
                          {/* Tags selecionadas */}
                          {newIntegration.selectedTagIds.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {newIntegration.selectedTagIds.map((tagId) => (
                                <Badge 
                                  key={tagId}
                                  variant="secondary" 
                                  className="flex items-center gap-1"
                                  style={{ backgroundColor: `${getSelectedTagColor(tagId)}20`, color: getSelectedTagColor(tagId) }}
                                >
                                  {getSelectedTagName(tagId)}
                                  <X 
                                    className="h-3 w-3 cursor-pointer hover:bg-black/20 rounded-full" 
                                    onClick={() => removeTag(tagId)}
                                  />
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          {/* Lista de tags disponíveis */}
                          <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                            <div className="space-y-2">
                              {tags?.map((tag) => (
                                <div key={tag.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`tag-${tag.id}`}
                                    checked={newIntegration.selectedTagIds.includes(tag.id)}
                                    onCheckedChange={(checked) => handleTagToggle(tag.id, checked as boolean)}
                                  />
                                  <label
                                    htmlFor={`tag-${tag.id}`}
                                    className="flex items-center gap-2 text-sm cursor-pointer"
                                  >
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: tag.color }}
                                    />
                                    {tag.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="pipeline-select">Pipeline de Destino *</Label>
                        <Select
                          value={newIntegration.selectedPipelineId}
                          onValueChange={(value) => setNewIntegration({ ...newIntegration, selectedPipelineId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o pipeline onde os leads serão criados" />
                          </SelectTrigger>
                          <SelectContent>
                            {pipelines?.map((pipeline) => (
                              <SelectItem key={pipeline.id} value={pipeline.id}>
                                {pipeline.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Como funciona:</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Um webhook único será gerado para esta integração</li>
                        <li>• Configure esta URL na plataforma de vendas</li>
                        <li>• Quando uma venda for realizada, o lead será criado ou atualizado automaticamente</li>
                        <li>• As tags selecionadas serão aplicadas no pipeline escolhido</li>
                        <li>• O status será marcado como "ganho"</li>
                      </ul>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleCreateIntegration}>
                        Criar Integração
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsCreating(false);
                          setNewIntegration({ name: '', platform: '', selectedTagIds: [], selectedPipelineId: '' });
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Documentação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Documentação das Plataformas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Como configurar webhooks:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• <strong>Hotmart:</strong> Área do Produtor → Webhook de Venda</li>
                    <li>• <strong>Eduzz:</strong> Painel → Configurações → Postback</li>
                    <li>• <strong>Monetizze:</strong> Minha Conta → Webhooks</li>
                    <li>• <strong>Kiwify:</strong> Configurações → Integrações</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Dados enviados:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Nome do comprador</li>
                    <li>• E-mail do comprador</li>
                    <li>• Telefone (se disponível)</li>
                    <li>• Valor da compra</li>
                    <li>• Data da transação</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="form-webhooks">
          <FormWebhookSettings />
        </TabsContent>

        <TabsContent value="n8n-webhook">
          <N8nWebhookSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}