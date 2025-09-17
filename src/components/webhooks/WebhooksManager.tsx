
import { useState } from 'react';
import { useWebhooks, useDeleteWebhook } from '@/hooks/useWebhooks';
import { useWorkspaces } from '@/hooks/useWorkspace';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Copy, Check, ExternalLink, Edit, Trash2 } from 'lucide-react';
import CreateWebhookDialog from './CreateWebhookDialog';
import EditWebhookDialog from './EditWebhookDialog';
import { useTeamManagement } from '@/hooks/useTeamManagement';

export default function WebhooksManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const { data: workspaces } = useWorkspaces();
  const currentWorkspace = workspaces?.[0];
  const { data: webhooks = [] } = useWebhooks(currentWorkspace?.id);
  const deleteWebhook = useDeleteWebhook();
  const { currentUserRole } = useTeamManagement();

  const isAllowedToManage = currentUserRole === 'admin';

  const handleCopyUrl = async (webhookId: string) => {
    // Gerar URL com workspace_id para garantir que funcione
    const webhookUrl = `https://rxpaaskbhbdirlxaavsm.supabase.co/functions/v1/webhook-receiver?workspace_id=${currentWorkspace?.id}&webhook_id=${webhookId}`;
    await navigator.clipboard.writeText(webhookUrl);
    setCopiedId(webhookId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleEditWebhook = (webhook: any) => {
    setEditingWebhook(webhook);
    setIsEditDialogOpen(true);
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (confirm('Tem certeza que deseja excluir este webhook? Esta ação não pode ser desfeita.')) {
      await deleteWebhook.mutateAsync(webhookId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gerenciar Webhooks</h2>
          <p className="text-gray-600 mt-1">
            Configure webhooks para receber leads automaticamente
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} disabled={!isAllowedToManage}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Webhook
        </Button>
      </div>

      {currentUserRole && !isAllowedToManage && (
        <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md">
          Você não tem permissão para gerenciar webhooks. Apenas administradores podem fazer alterações.
        </p>
      )}

      {webhooks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">Nenhum webhook configurado</p>
            <Button onClick={() => setIsCreateDialogOpen(true)} disabled={!isAllowedToManage}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Webhook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {webhooks.map((webhook) => {
            // Gerar URL correta com workspace_id
            const webhookUrl = `https://rxpaaskbhbdirlxaavsm.supabase.co/functions/v1/webhook-receiver?workspace_id=${currentWorkspace?.id}&webhook_id=${webhook.id}`;
            
            return (
              <Card key={webhook.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{webhook.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                        {webhook.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditWebhook(webhook)}
                        className="text-blue-600 hover:text-blue-700"
                        disabled={!isAllowedToManage}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteWebhook(webhook.id)}
                        className="text-red-600 hover:text-red-700"
                        disabled={!isAllowedToManage}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">URL do Webhook:</label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm font-mono break-all">
                        {webhookUrl}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyUrl(webhook.id)}
                        className="flex-shrink-0"
                      >
                        {copiedId === webhook.id ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {webhook.pipeline && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Pipeline:</label>
                      <p className="text-sm text-gray-900 mt-1">{webhook.pipeline.name}</p>
                    </div>
                  )}

                  {webhook.stage && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Estágio Inicial:</label>
                      <p className="text-sm text-gray-900 mt-1">{webhook.stage.name}</p>
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    Criado em: {new Date(webhook.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateWebhookDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        workspaceId={currentWorkspace?.id}
      />

      <EditWebhookDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        webhook={editingWebhook}
        onClose={() => {
          setIsEditDialogOpen(false);
          setEditingWebhook(null);
        }}
      />
    </div>
  );
}
