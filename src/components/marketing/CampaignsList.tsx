
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, MessageSquare, Play, Pause, Trash2, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMarketingCampaigns, useStartCampaign, useDeleteCampaign } from '@/hooks/useMarketingCampaigns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface CampaignsListProps {
  filter?: 'all' | 'scheduled' | 'sent' | 'draft' | 'sending';
}

export default function CampaignsList({ filter = 'all' }: CampaignsListProps) {
  const { data: campaigns = [], isLoading } = useMarketingCampaigns(filter);
  const startCampaign = useStartCampaign();
  const deleteCampaign = useDeleteCampaign();

  const handleStartCampaign = async (campaignId: string) => {
    await startCampaign.mutateAsync(campaignId);
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    await deleteCampaign.mutateAsync(campaignId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhuma campanha encontrada
          </h3>
          <p className="text-gray-600">
            {filter === 'all' 
              ? 'Crie sua primeira campanha de WhatsApp marketing.'
              : `Não há campanhas ${filter === 'scheduled' ? 'agendadas' : filter === 'sent' ? 'enviadas' : filter}.`
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {campaigns.map((campaign) => (
        <Card key={campaign.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg mb-2">{campaign.name}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <div className="text-sm text-gray-600">{campaign.recipients_count} destinatários</div>
                  </div>
                  {campaign.scheduled_at && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(campaign.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    {campaign.template_name}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge 
                  variant={
                    campaign.status === 'sent' ? 'default' :
                    campaign.status === 'scheduled' ? 'secondary' :
                    campaign.status === 'sending' ? 'destructive' :
                    campaign.status === 'draft' ? 'outline' :
                    'secondary'
                  }
                  className={
                    campaign.status === 'sending' ? 'animate-pulse' : ''
                  }
                >
                  {campaign.status === 'sent' && 'Enviada'}
                  {campaign.status === 'scheduled' && 'Agendada'}
                  {campaign.status === 'sending' && 'Enviando...'}
                  {campaign.status === 'draft' && 'Rascunho'}
                  {campaign.status === 'failed' && 'Falhou'}
                </Badge>
                
                <div className="flex items-center gap-1">
                  {(campaign.status === 'scheduled' || campaign.status === 'draft') && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleStartCampaign(campaign.id)}
                      disabled={startCampaign.isPending}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir a campanha "{campaign.name}"? 
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDeleteCampaign(campaign.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-gray-700 line-clamp-2">
                {campaign.message_preview}
              </p>
            </div>
            
            {/* Estatísticas de Envio */}
            {campaign.status !== 'draft' && (
              <div className="grid grid-cols-2 gap-6 mb-4">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-blue-700">{campaign.sent_count || 0}</div>
                      <div className="text-sm font-medium text-blue-600">Enviadas</div>
                    </div>
                    <MessageSquare className="h-8 w-8 text-blue-500" />
                  </div>
                </div>
                <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-red-700">{campaign.failed_count || 0}</div>
                      <div className="text-sm font-medium text-red-600">Falharam</div>
                    </div>
                    <BarChart3 className="h-8 w-8 text-red-500" />
                  </div>
                </div>
              </div>
            )}
            
            {/* Segmentação */}
            {campaign.segments && (
              <div className="flex gap-2 flex-wrap">
                {campaign.segments.tags?.map((tagId: string) => (
                  <Badge key={tagId} variant="outline" className="text-xs">
                    Tag ID: {tagId}
                  </Badge>
                ))}
                {campaign.segments.pipeline && (
                  <Badge variant="outline" className="text-xs">
                    Pipeline: {campaign.segments.pipeline}
                  </Badge>
                )}
                {campaign.segments.type === 'manual' && (
                  <Badge variant="outline" className="text-xs">
                    Seleção Manual
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
