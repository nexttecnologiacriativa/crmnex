import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useMetaIntegrations, useCreateMetaIntegration, useUpdateMetaIntegration, useDeleteMetaIntegration, useMetaLeadForms, useSyncMetaForms } from '@/hooks/useMetaIntegrations';
import { usePipelines } from '@/hooks/usePipeline';
import { useLeadTags } from '@/hooks/useLeadTags';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Trash2, Settings, RefreshCw, ExternalLink, Facebook, AlertCircle, CheckCircle2 } from 'lucide-react';

interface MetaIntegrationsSettingsProps {
  currentUserRole?: 'admin' | 'manager' | 'user';
}

export default function MetaIntegrationsSettings({ currentUserRole }: MetaIntegrationsSettingsProps) {
  const { toast } = useToast();
  const { currentWorkspace } = useWorkspace();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(null);
  
  const { data: integrations = [], isLoading } = useMetaIntegrations();
  const { data: pipelines = [] } = usePipelines(currentWorkspace?.id);
  const { data: tags = [] } = useLeadTags();
  const { data: forms = [] } = useMetaLeadForms(selectedIntegrationId || undefined);
  
  const createIntegration = useCreateMetaIntegration();
  const updateIntegration = useUpdateMetaIntegration();
  const deleteIntegration = useDeleteMetaIntegration();
  const syncForms = useSyncMetaForms();

  const canEdit = currentUserRole === 'admin' || currentUserRole === 'manager';

  const [formData, setFormData] = useState({
    name: '',
    meta_app_id: '',
    app_secret: '',
    selected_pipeline_id: '',
    selected_tag_ids: [] as string[]
  });

  const handleCreateIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.meta_app_id || !formData.app_secret || !formData.selected_pipeline_id) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await createIntegration.mutateAsync(formData);
      
      // Open OAuth URL in a new window
      const oauthWindow = window.open(
        result.oauth_url,
        'meta-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      // Monitor OAuth completion
      const checkClosed = setInterval(() => {
        if (oauthWindow?.closed) {
          clearInterval(checkClosed);
          setIsCreateDialogOpen(false);
          setFormData({
            name: '',
            meta_app_id: '',
            app_secret: '',
            selected_pipeline_id: '',
            selected_tag_ids: []
          });
          
          toast({
            title: "Integração criada",
            description: "A integração com o Meta foi configurada com sucesso!"
          });
        }
      }, 1000);

    } catch (error) {
      console.error('Error creating Meta integration:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar integração com o Meta",
        variant: "destructive"
      });
    }
  };

  const handleToggleIntegration = async (id: string, isActive: boolean) => {
    try {
      await updateIntegration.mutateAsync({ id, is_active: !isActive });
      toast({
        title: "Integração atualizada",
        description: `Integração ${!isActive ? 'ativada' : 'desativada'} com sucesso`
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao atualizar integração",
        variant: "destructive"
      });
    }
  };

  const handleDeleteIntegration = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta integração?')) return;
    
    try {
      await deleteIntegration.mutateAsync(id);
      toast({
        title: "Integração excluída",
        description: "A integração foi removida com sucesso"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao excluir integração",
        variant: "destructive"
      });
    }
  };

  const handleSyncForms = async (integrationId: string) => {
    try {
      const result = await syncForms.mutateAsync(integrationId);
      toast({
        title: "Formulários sincronizados",
        description: `${result.synced_forms} formulários foram sincronizados`
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao sincronizar formulários",
        variant: "destructive"
      });
    }
  };

  const getWebhookUrl = (integrationId: string) => {
    const baseUrl = window.location.origin.replace('localhost:3000', 'mqotdnvwyjhyiqzbefpm.supabase.co');
    return `${baseUrl}/functions/v1/meta-webhook-receiver?integration_id=${integrationId}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "URL copiada para a área de transferência"
    });
  };

  if (isLoading) {
    return <div className="flex justify-center py-8">Carregando integrações...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Integrações Meta Lead Ads</h3>
          <p className="text-sm text-muted-foreground">
            Configure integrações com formulários do Meta (Facebook/Instagram) para capturar leads automaticamente
          </p>
        </div>
        
        {canEdit && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Facebook className="w-4 h-4 mr-2" />
                Nova Integração Meta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nova Integração Meta</DialogTitle>
                <DialogDescription>
                  Configure uma nova integração com Meta Lead Ads
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreateIntegration} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome da Integração</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Campanha Facebook"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="meta_app_id">App ID do Meta</Label>
                  <Input
                    id="meta_app_id"
                    value={formData.meta_app_id}
                    onChange={(e) => setFormData({ ...formData, meta_app_id: e.target.value })}
                    placeholder="ID do aplicativo Meta"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="app_secret">App Secret</Label>
                  <Input
                    id="app_secret"
                    type="password"
                    value={formData.app_secret}
                    onChange={(e) => setFormData({ ...formData, app_secret: e.target.value })}
                    placeholder="Chave secreta do aplicativo"
                    required
                  />
                </div>

                <div>
                  <Label>Pipeline de Destino</Label>
                  <Select 
                    value={formData.selected_pipeline_id} 
                    onValueChange={(value) => setFormData({ ...formData, selected_pipeline_id: value })}
                    required
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

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createIntegration.isPending}>
                    {createIntegration.isPending ? 'Criando...' : 'Criar Integração'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4">
        {integrations.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Facebook className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Nenhuma integração Meta configurada</h3>
              <p className="text-muted-foreground mb-4">
                Configure uma integração para começar a receber leads do Meta automaticamente
              </p>
              {canEdit && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Facebook className="w-4 h-4 mr-2" />
                  Criar Primeira Integração
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          integrations.map((integration) => (
            <Card key={integration.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Facebook className="w-5 h-5 text-blue-600" />
                    <div>
                      <CardTitle className="text-base">{integration.name}</CardTitle>
                      <CardDescription>App ID: {integration.meta_app_id}</CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {integration.is_active ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Inativo
                      </Badge>
                    )}
                    
                    {canEdit && (
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSyncForms(integration.id)}
                          disabled={syncForms.isPending}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleIntegration(integration.id, integration.is_active)}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteIntegration(integration.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <Tabs defaultValue="config" className="w-full">
                  <TabsList>
                    <TabsTrigger value="config">Configuração</TabsTrigger>
                    <TabsTrigger value="forms" onClick={() => setSelectedIntegrationId(integration.id)}>
                      Formulários
                    </TabsTrigger>
                    <TabsTrigger value="webhook">Webhook</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="config" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-muted-foreground">Pipeline</Label>
                        <p className="font-medium">
                          {pipelines.find(p => p.id === integration.selected_pipeline_id)?.name || 'Pipeline não encontrado'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Tags</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {integration.selected_tag_ids.length > 0 ? (
                            integration.selected_tag_ids.map(tagId => {
                              const tag = tags.find(t => t.id === tagId);
                              return tag ? (
                                <Badge key={tagId} variant="outline" style={{ backgroundColor: tag.color + '20', color: tag.color }}>
                                  {tag.name}
                                </Badge>
                              ) : null;
                            })
                          ) : (
                            <span className="text-muted-foreground">Nenhuma tag selecionada</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="forms" className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Formulários sincronizados</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSyncForms(integration.id)}
                        disabled={syncForms.isPending}
                      >
                        <RefreshCw className="w-3 h-3 mr-2" />
                        Sincronizar
                      </Button>
                    </div>
                    
                    {forms.length > 0 ? (
                      <div className="space-y-2">
                        {forms.map((form) => (
                          <div key={form.id} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{form.form_name}</p>
                                <p className="text-xs text-muted-foreground">{form.page_name}</p>
                              </div>
                              <Badge variant="outline">
                                {form.fields_schema.length} campos
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        Nenhum formulário encontrado. Clique em "Sincronizar" para buscar formulários.
                      </p>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="webhook" className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">URL do Webhook</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Input
                          value={getWebhookUrl(integration.id)}
                          readOnly
                          className="font-mono text-xs"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(getWebhookUrl(integration.id))}
                        >
                          Copiar
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Configure esta URL como webhook na sua aplicação Meta
                      </p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Token de Verificação</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Input
                          value={integration.webhook_verify_token}
                          readOnly
                          className="font-mono text-xs"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(integration.webhook_verify_token)}
                        >
                          Copiar
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}