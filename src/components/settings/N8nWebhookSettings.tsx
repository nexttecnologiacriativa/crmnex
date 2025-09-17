import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Copy, Save, Info, Plus, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useN8nWebhooks, useCreateN8nWebhook, useUpdateN8nWebhook, useDeleteN8nWebhook } from "@/hooks/useN8nWebhooks";
import { usePipelines } from "@/hooks/usePipeline";
import { useWorkspace } from "@/hooks/useWorkspace";

interface WebhookFormData {
  id?: string;
  name: string;
  webhook_url: string;
  pipeline_id: string;
  is_active: boolean;
}

export default function N8nWebhookSettings() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookFormData | null>(null);
  const [formData, setFormData] = useState<WebhookFormData>({
    name: "",
    webhook_url: "",
    pipeline_id: "",
    is_active: true,
  });

  const { toast } = useToast();
  const { currentWorkspace } = useWorkspace();
  const { data: webhooks, isLoading } = useN8nWebhooks();
  const { data: pipelines, isLoading: isPipelinesLoading, error: pipelinesError } = usePipelines(currentWorkspace?.id);
  const createWebhook = useCreateN8nWebhook();
  const updateWebhook = useUpdateN8nWebhook();
  const deleteWebhook = useDeleteN8nWebhook();

  // Debug logs - removr após confirmar funcionamento
  console.log('N8nWebhookSettings - currentWorkspace:', currentWorkspace);
  console.log('N8nWebhookSettings - pipelines:', pipelines);
  console.log('N8nWebhookSettings - isPipelinesLoading:', isPipelinesLoading);
  console.log('N8nWebhookSettings - pipelinesError:', pipelinesError);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "URL copiada para a área de transferência",
    });
  };

  const handleSubmit = async () => {
    if (!currentWorkspace) {
      toast({
        title: "Erro",
        description: "Workspace não encontrado. Recarregue a página.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.name || !formData.webhook_url || !formData.pipeline_id) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingWebhook?.id) {
        await updateWebhook.mutateAsync({
          id: editingWebhook.id,
          ...formData,
        });
      } else {
        await createWebhook.mutateAsync(formData);
      }
      
      setIsDialogOpen(false);
      setEditingWebhook(null);
      setFormData({
        name: "",
        webhook_url: "",
        pipeline_id: "",
        is_active: true,
      });
    } catch (error) {
      console.error('Error saving webhook:', error);
    }
  };

  const handleEdit = (webhook: any) => {
    setEditingWebhook(webhook);
    setFormData({
      id: webhook.id,
      name: webhook.name,
      webhook_url: webhook.webhook_url,
      pipeline_id: webhook.pipeline_id,
      is_active: webhook.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este webhook?")) {
      await deleteWebhook.mutateAsync(id);
    }
  };

  const getPipelineName = (pipelineId: string) => {
    return pipelines?.find(p => p.id === pipelineId)?.name || "Pipeline não encontrado";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Webhooks n8n por Pipeline
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Webhook
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingWebhook ? "Editar Webhook" : "Novo Webhook n8n"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Webhook</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Webhook Vendas"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pipeline">Pipeline</Label>
                  <Select
                    value={formData.pipeline_id}
                    onValueChange={(value) => setFormData({...formData, pipeline_id: value})}
                    disabled={isPipelinesLoading || !currentWorkspace}
                  >
                    <SelectTrigger>
                      <SelectValue 
                        placeholder={
                          isPipelinesLoading 
                            ? "Carregando pipelines..." 
                            : !currentWorkspace 
                              ? "Carregando workspace..." 
                              : pipelinesError 
                                ? "Erro ao carregar pipelines" 
                                : pipelines?.length === 0
                                  ? "Nenhum pipeline encontrado"
                                  : "Selecione um pipeline"
                        } 
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {pipelines?.map((pipeline) => (
                        <SelectItem key={pipeline.id} value={pipeline.id}>
                          {pipeline.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {pipelinesError && (
                    <p className="text-sm text-destructive">
                      Erro ao carregar pipelines. Recarregue a página.
                    </p>
                  )}
                  {!isPipelinesLoading && !pipelinesError && pipelines?.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nenhum pipeline encontrado. Crie um pipeline primeiro.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhook-url">URL do Webhook</Label>
                  <Input
                    id="webhook-url"
                    type="url"
                    placeholder="https://seu-n8n.com/webhook/leadflow"
                    value={formData.webhook_url}
                    onChange={(e) => setFormData({...formData, webhook_url: e.target.value})}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                  />
                  <Label htmlFor="active">Webhook ativo</Label>
                </div>

                <Button 
                  onClick={handleSubmit} 
                  className="w-full"
                  disabled={createWebhook.isPending || updateWebhook.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingWebhook ? "Atualizar" : "Criar"} Webhook
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p>Carregando webhooks...</p>
          ) : webhooks?.length === 0 ? (
            <p className="text-muted-foreground">Nenhum webhook configurado</p>
          ) : (
            <div className="space-y-3">
              {webhooks?.map((webhook) => (
                <div key={webhook.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{webhook.name}</h4>
                      <Badge variant={webhook.is_active ? "default" : "secondary"}>
                        {webhook.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(webhook.webhook_url)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(webhook)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(webhook.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Pipeline: {getPipelineName(webhook.pipeline_id)}
                  </p>
                  <p className="text-sm text-muted-foreground break-all">
                    {webhook.webhook_url}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Como funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>• Quando um novo lead é criado no pipeline selecionado, os dados são automaticamente enviados para o webhook n8n</p>
            <p>• Você pode configurar múltiplos webhooks para diferentes pipelines</p>
            <p>• Os dados incluem nome, email, telefone, empresa, pipeline, estágio e campos personalizados</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}