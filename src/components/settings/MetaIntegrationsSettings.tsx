import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useMetaIntegrations, useCreateMetaIntegration, useUpdateMetaIntegration, useDeleteMetaIntegration, useMetaLeadForms, useSyncMetaForms } from '@/hooks/useMetaIntegrations';
import { usePipelines } from '@/hooks/usePipeline';
import { useLeadTags } from '@/hooks/useLeadTags';
import { useWorkspace } from '@/hooks/useWorkspace';
import MetaSetupInstructions from './MetaSetupInstructions';
import MetaWebhookLogs from './MetaWebhookLogs';
import MetaFormSettings from './MetaFormSettings';
import { Trash2, RefreshCw, ExternalLink, Facebook, AlertCircle, CheckCircle2, HelpCircle, Copy, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MetaIntegrationsSettingsProps {
  currentUserRole?: 'admin' | 'manager' | 'user';
}

export default function MetaIntegrationsSettings({ currentUserRole }: MetaIntegrationsSettingsProps) {
  const { toast } = useToast();
  const { currentWorkspace } = useWorkspace();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(null);
  const [fetchingLeads, setFetchingLeads] = useState<string | null>(null);
  
  const { data: integrations = [], isLoading, refetch } = useMetaIntegrations();
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

  const handleTagToggle = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      selected_tag_ids: prev.selected_tag_ids.includes(tagId)
        ? prev.selected_tag_ids.filter(id => id !== tagId)
        : [...prev.selected_tag_ids, tagId]
    }));
  };

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
      
      console.log('✅ Integration created:', result);
      
      // Use the OAuth URL from the result
      if (result.oauth_url) {
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
            
            // Refresh integrations list
            refetch();
            
            toast({
              title: "Processo iniciado",
              description: "Verifique se a integração foi conectada com sucesso"
            });
          }
        }, 1000);
      } else {
        // If no OAuth URL, just close dialog and refresh
        setIsCreateDialogOpen(false);
        refetch();
        toast({
          title: "Integração criada",
          description: "Configure o webhook manualmente no Meta Developer"
        });
      }

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
    if (!confirm('Tem certeza que deseja excluir esta integração? Os leads já criados não serão afetados.')) return;
    
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
        description: `${result?.synced_forms || 0} formulários foram sincronizados`
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao sincronizar formulários. Verifique se a integração está conectada.",
        variant: "destructive"
      });
    }
  };

  const getWebhookUrl = (integrationId: string) => {
    return `https://mqotdnvwyjhyiqzbefpm.supabase.co/functions/v1/meta-webhook-receiver?integration_id=${integrationId}`;
  };

  const copyToClipboard = (text: string, label = 'Texto') => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${label} copiado para a área de transferência`
    });
  };

  const handleFetchMissingLeads = async (integrationId: string) => {
    setFetchingLeads(integrationId);
    
    try {
      const { data, error } = await supabase.functions.invoke('meta-fetch-leads', {
        body: { integration_id: integrationId, days_back: 7 }
      });

      if (error) {
        console.error('Error fetching missing leads:', error);
        toast({
          title: "Erro",
          description: "Falha ao buscar leads. Verifique os logs.",
          variant: "destructive"
        });
        return;
      }

      console.log('Fetch leads result:', data);

      if (data.success) {
        const { summary, created_leads } = data;
        
        if (summary.leads_created > 0) {
          toast({
            title: "Leads Recuperados! 🎉",
            description: `${summary.leads_created} lead(s) criado(s). ${summary.leads_already_in_crm} já existiam no CRM.`,
          });
        } else if (summary.leads_found_in_meta > 0) {
          toast({
            title: "Nenhum lead novo",
            description: `${summary.leads_found_in_meta} lead(s) encontrado(s) no Meta, mas todos já existem no CRM.`,
          });
        } else {
          toast({
            title: "Nenhum lead encontrado",
            description: "Não foram encontrados leads nos últimos 7 dias.",
          });
        }

        if (summary.errors.length > 0) {
          console.warn('Fetch errors:', summary.errors);
        }
      } else {
        toast({
          title: "Erro",
          description: data.message || "Falha ao buscar leads",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: "Falha ao buscar leads perdidos",
        variant: "destructive"
      });
    } finally {
      setFetchingLeads(null);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8">Carregando integrações...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Integrações Meta Lead Ads</h3>
          <p className="text-sm text-muted-foreground">
            Capture leads do Facebook e Instagram automaticamente no seu CRM
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowInstructions(!showInstructions)}
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            {showInstructions ? 'Ocultar Guia' : 'Como Configurar'}
          </Button>
          
          {canEdit && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Facebook className="w-4 h-4 mr-2" />
                  Nova Integração
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Facebook className="w-5 h-5 text-blue-600" />
                    Nova Integração Meta Lead Ads
                  </DialogTitle>
                  <DialogDescription>
                    Configure sua integração para receber leads automaticamente
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleCreateIntegration} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome da Integração *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Leads Facebook Principal"
                      required
                    />
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Credenciais do Meta</Label>
                      <Button variant="link" size="sm" className="h-auto p-0" asChild>
                        <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Abrir Meta Developer
                        </a>
                      </Button>
                    </div>
                    
                    <div>
                      <Label htmlFor="meta_app_id">App ID *</Label>
                      <Input
                        id="meta_app_id"
                        value={formData.meta_app_id}
                        onChange={(e) => setFormData({ ...formData, meta_app_id: e.target.value })}
                        placeholder="123456789012345"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Encontre em Configurações {">"} Básico
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="app_secret">App Secret *</Label>
                      <Input
                        id="app_secret"
                        type="password"
                        value={formData.app_secret}
                        onChange={(e) => setFormData({ ...formData, app_secret: e.target.value })}
                        placeholder="Chave secreta do aplicativo"
                        required
                      />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label>Pipeline de Destino *</Label>
                    <Select 
                      value={formData.selected_pipeline_id} 
                      onValueChange={(value) => setFormData({ ...formData, selected_pipeline_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione onde os leads serão criados" />
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

                  <div>
                    <Label>Tags Automáticas (opcional)</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Leads criados receberão estas tags automaticamente
                    </p>
                    <div className="flex flex-wrap gap-2 p-3 border rounded-lg max-h-32 overflow-y-auto">
                      {tags.map((tag) => (
                        <label 
                          key={tag.id} 
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Checkbox
                            checked={formData.selected_tag_ids.includes(tag.id)}
                            onCheckedChange={() => handleTagToggle(tag.id)}
                          />
                          <Badge 
                            variant="outline" 
                            style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color }}
                          >
                            {tag.name}
                          </Badge>
                        </label>
                      ))}
                      {tags.length === 0 && (
                        <span className="text-sm text-muted-foreground">Nenhuma tag disponível</span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createIntegration.isPending}>
                      <Facebook className="w-4 h-4 mr-2" />
                      {createIntegration.isPending ? 'Conectando...' : 'Conectar com Facebook'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Instructions Panel */}
      {showInstructions && (
        <Card>
          <CardContent className="pt-6">
            <MetaSetupInstructions />
          </CardContent>
        </Card>
      )}

      {/* Integrations List */}
      <div className="grid gap-4">
        {integrations.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Facebook className="w-12 h-12 mx-auto mb-4 text-blue-500" />
              <h3 className="text-lg font-medium mb-2">Nenhuma integração configurada</h3>
              <p className="text-muted-foreground mb-4">
                Configure sua primeira integração para começar a receber leads do Meta automaticamente
              </p>
              {canEdit && (
                <div className="flex flex-col items-center gap-2">
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Facebook className="w-4 h-4 mr-2" />
                    Criar Primeira Integração
                  </Button>
                  <Button variant="link" onClick={() => setShowInstructions(true)}>
                    Ver guia de configuração
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          integrations.map((integration) => (
            <Card key={integration.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Facebook className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{integration.name}</CardTitle>
                      <CardDescription>App ID: {integration.meta_app_id}</CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {integration.is_active && integration.access_token !== 'pending' ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Conectado
                      </Badge>
                    ) : integration.access_token === 'pending' ? (
                      <Badge variant="secondary">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Aguardando OAuth
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        Desativado
                      </Badge>
                    )}
                    
                    {canEdit && (
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFetchMissingLeads(integration.id)}
                          disabled={fetchingLeads === integration.id}
                          title="Buscar leads perdidos"
                        >
                          {fetchingLeads === integration.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSyncForms(integration.id)}
                          disabled={syncForms.isPending}
                          title="Sincronizar formulários"
                        >
                          <RefreshCw className={`w-4 h-4 ${syncForms.isPending ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleIntegration(integration.id, integration.is_active)}
                          title={integration.is_active ? 'Desativar' : 'Ativar'}
                        >
                          {integration.is_active ? '🔴' : '🟢'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteIntegration(integration.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Excluir integração"
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
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="config">Configuração</TabsTrigger>
                    <TabsTrigger value="forms" onClick={() => setSelectedIntegrationId(integration.id)}>
                      Formulários
                    </TabsTrigger>
                    <TabsTrigger value="webhook">Webhook</TabsTrigger>
                    <TabsTrigger value="logs" onClick={() => setSelectedIntegrationId(integration.id)}>
                      Logs
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="config" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-muted-foreground">Pipeline de Destino</Label>
                        <p className="font-medium">
                          {pipelines.find(p => p.id === integration.selected_pipeline_id)?.name || 'Pipeline não encontrado'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Tags Automáticas</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {integration.selected_tag_ids.length > 0 ? (
                            integration.selected_tag_ids.map(tagId => {
                              const tag = tags.find(t => t.id === tagId);
                              return tag ? (
                                <Badge 
                                  key={tagId} 
                                  variant="outline" 
                                  style={{ backgroundColor: tag.color + '20', color: tag.color }}
                                >
                                  {tag.name}
                                </Badge>
                              ) : null;
                            })
                          ) : (
                            <span className="text-muted-foreground">Nenhuma tag</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="forms" className="space-y-3 mt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Formulários sincronizados</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSyncForms(integration.id)}
                        disabled={syncForms.isPending}
                      >
                        <RefreshCw className={`w-3 h-3 mr-2 ${syncForms.isPending ? 'animate-spin' : ''}`} />
                        Sincronizar
                      </Button>
                    </div>
                    
                    {selectedIntegrationId === integration.id && forms.length > 0 ? (
                      <div className="space-y-4">
                        {forms.map((form) => (
                          <MetaFormSettings 
                            key={form.id} 
                            form={form}
                            integrationTagIds={integration.selected_tag_ids || []}
                            onUpdate={() => refetch()}
                          />
                        ))}
                      </div>
                    ) : selectedIntegrationId === integration.id ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        Nenhum formulário encontrado. Clique em "Sincronizar" para buscar.
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        Clique na aba para carregar os formulários
                      </p>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="webhook" className="space-y-4 mt-4">
                    <div className="p-4 bg-muted rounded-lg space-y-4">
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
                            onClick={() => copyToClipboard(getWebhookUrl(integration.id), 'URL')}
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copiar
                          </Button>
                        </div>
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
                            onClick={() => copyToClipboard(integration.webhook_verify_token, 'Token')}
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copiar
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>📌 Configure esta URL no Meta Developer em <strong>Webhooks</strong></p>
                      <p>📌 Selecione o campo <strong>leadgen</strong> para receber leads</p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="logs" className="mt-4">
                    {selectedIntegrationId === integration.id && (
                      <MetaWebhookLogs integrationId={integration.id} />
                    )}
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