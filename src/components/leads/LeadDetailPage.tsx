import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Phone, Mail, Building, Calendar, Tag, Plus, Edit, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { useLeads, useUpdateLead } from '@/hooks/useLeads';
import { useWorkspaces } from '@/hooks/useWorkspace';
import { useLeadActivities, useCreateLeadActivity } from '@/hooks/useLeadActivities';
import CreateTaskFromLeadDialog from '../tasks/CreateTaskFromLeadDialog';
import EditLeadDialog from './EditLeadDialog';
import LeadTagSelector from './LeadTagSelector';
import EditActivityDialog from './EditActivityDialog';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LeadTasks from './LeadTasks';
import LeadMultiplePipelinesManager from './LeadMultiplePipelinesManager';
import LeadTimeline from './LeadTimeline';
import { useDeleteLead } from '@/hooks/useLeads';
import { getLeadDisplayName } from '@/lib/leadUtils';

const statusColors = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  qualified: 'bg-green-100 text-green-800',
  proposal: 'bg-purple-100 text-purple-800',
  negotiation: 'bg-orange-100 text-orange-800',
  closed_won: 'bg-emerald-100 text-emerald-800',
  closed_lost: 'bg-red-100 text-red-800',
};

const statusLabels = {
  new: 'Novo',
  contacted: 'Contatado',
  qualified: 'Qualificado',
  proposal: 'Proposta',
  negotiation: 'Negociação',
  closed_won: 'Ganho',
  closed_lost: 'Perdido',
};

const activityTypeLabels = {
  note: 'Anotação',
  call: 'Ligação',
  email: 'Email',
  meeting: 'Reunião',
  status_change: 'Mudança de Status',
};

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [newNote, setNewNote] = useState('');
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [isEditLeadDialogOpen, setIsEditLeadDialogOpen] = useState(false);
  const [isEditActivityDialogOpen, setIsEditActivityDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);

  const { data: workspaces } = useWorkspaces();
  const currentWorkspace = workspaces?.[0];
  const { data: leads = [] } = useLeads();
  const lead = leads.find(l => l.id === id);

  const { data: activities = [] } = useLeadActivities(id || '');
  
  const createActivity = useCreateLeadActivity();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();

  if (!lead) {
    return (
      <DashboardLayout>
        <div className="min-h-screen p-6">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Lead não encontrado</h1>
            <Button onClick={() => navigate('/pipeline')} className="gradient-premium text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Pipeline
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      await createActivity.mutateAsync({
        lead_id: lead.id,
        activity_type: 'note',
        title: 'Nova anotação',
        description: newNote,
      });
      
      setNewNote('');
    } catch (error) {
      console.error('Erro ao criar atividade:', error);
    }
  };

  const handleEditActivity = (activity: any) => {
    setSelectedActivity(activity);
    setIsEditActivityDialogOpen(true);
  };

  const formatCurrency = (value: number | null, currency: string) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL'
    }).format(value);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen p-4 md:p-6">
        <div className="w-full space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/pipeline')}
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-nexcrm-green">
                  {getLeadDisplayName(lead)}
                </h1>
                {lead.company && (
                  <p className="text-gray-600">{lead.position} at {lead.company}</p>
                )}
                
                {/* Botões de ação abaixo do nome */}
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  {lead.phone && (
                    <Button 
                      onClick={() => {
                        navigate('/atendimento', { state: { leadId: lead.id, phone: lead.phone } });
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white shadow-md"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Falar com o lead
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => setIsEditLeadDialogOpen(true)}
                    variant="outline"
                    className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Lead
                  </Button>
                  
                  <Button
                    onClick={() => setIsCreateTaskDialogOpen(true)}
                    variant="outline"
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Tarefa
                  </Button>
                  
                  <Button
                    onClick={() => {
                      if (confirm('Tem certeza que deseja excluir este lead?')) {
                        deleteLead.mutate(lead.id, {
                          onSuccess: () => {
                            navigate('/pipeline');
                          }
                        });
                      }
                    }}
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Lead
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lead Information */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <Tabs defaultValue="info" className="w-full">
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="info">Informações</TabsTrigger>
                      <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
                      <TabsTrigger value="tasks">Tarefas</TabsTrigger>
                      <TabsTrigger value="activities">Atividades</TabsTrigger>
                      <TabsTrigger value="timeline">Histórico</TabsTrigger>
                    </TabsList>

                    {/* Tab: Informações */}
                    <TabsContent value="info" className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          {lead.email && (
                            <div className="flex items-center gap-3">
                              <Mail className="h-4 w-4 text-nexcrm-blue" />
                              <span className="text-sm">{lead.email}</span>
                            </div>
                          )}
                          
                          {lead.phone && (
                            <div className="flex items-center gap-3">
                              <Phone className="h-4 w-4 text-nexcrm-green" />
                              <span className="text-sm">{lead.phone}</span>
                            </div>
                          )}
                          
                          {lead.company && (
                            <div className="flex items-center gap-3">
                              <Building className="h-4 w-4 text-nexcrm-blue" />
                              <span className="text-sm">{lead.company}</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="text-sm">
                              Criado em {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">Etapa Principal:</span>
                            {lead.pipeline_stages ? (
                              <Badge 
                                style={{ 
                                  backgroundColor: lead.pipeline_stages.color + '20', 
                                  color: lead.pipeline_stages.color, 
                                  borderColor: lead.pipeline_stages.color 
                                }}
                              >
                                {lead.pipeline_stages.name}
                              </Badge>
                            ) : (
                              <Badge className={statusColors[lead.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
                                {statusLabels[lead.status as keyof typeof statusLabels] || lead.status}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">Valor:</span>
                            <span className="text-sm font-semibold text-green-600">
                              {formatCurrency(lead.value, lead.currency)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* UTM Information */}
                      {(lead.utm_source || lead.utm_medium || lead.utm_campaign) && (
                        <div className="border-t pt-4">
                          <h4 className="font-medium mb-3">Informações de Origem</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {lead.utm_source && (
                              <Badge variant="outline" className="justify-center">
                                Source: {lead.utm_source}
                              </Badge>
                            )}
                            {lead.utm_medium && (
                              <Badge variant="outline" className="justify-center">
                                Medium: {lead.utm_medium}
                              </Badge>
                            )}
                            {lead.utm_campaign && (
                              <Badge variant="outline" className="justify-center">
                                Campaign: {lead.utm_campaign}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            Tags
                          </h4>
                        </div>
                        
                        <LeadTagSelector leadId={lead.id} />
                      </div>
                    </TabsContent>

                    {/* Tab: Pipelines */}
                    <TabsContent value="pipelines" className="mt-4">
                      {currentWorkspace && (
                        <LeadMultiplePipelinesManager 
                          leadId={lead.id}
                          workspaceId={currentWorkspace.id}
                        />
                      )}
                    </TabsContent>

                    {/* Tab: Tarefas */}
                    <TabsContent value="tasks" className="mt-4">
                      <LeadTasks leadId={lead.id} leadName={getLeadDisplayName(lead)} />
                    </TabsContent>

                    {/* Tab: Atividades */}
                    <TabsContent value="activities" className="mt-4">
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {activities.map((activity) => (
                          <div key={activity.id} className="border-l-2 border-premium-purple pl-4 pb-4 relative group">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <h5 className="font-medium text-sm">{activity.title}</h5>
                                <Badge variant="outline" className="text-xs">
                                  {activityTypeLabels[activity.activity_type] || activity.activity_type}
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditActivity(activity)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">{activity.description}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(activity.created_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        ))}
                        
                        {activities.length === 0 && (
                          <p className="text-gray-500 text-center py-8">
                            Nenhuma atividade registrada ainda.
                          </p>
                        )}
                      </div>
                    </TabsContent>

                    {/* Tab: Histórico Completo */}
                    <TabsContent value="timeline" className="mt-4">
                      <LeadTimeline 
                        leadId={lead.id}
                        onEditActivity={handleEditActivity}
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="space-y-6">
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-nexcrm-green/10 to-nexcrm-blue/10">
                  <CardTitle className="text-nexcrm-green">Nova Anotação</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Adicione uma anotação sobre este lead..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={4}
                    />
                    <Button
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || createActivity.isPending}
                      className="w-full gradient-premium text-white"
                    >
                      {createActivity.isPending ? 'Salvando...' : 'Adicionar Anotação'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {lead.notes && (
                <Card className="border-0 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-nexcrm-blue/10 to-nexcrm-green/10">
                    <CardTitle className="text-nexcrm-blue">Observações</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-600">{lead.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <CreateTaskFromLeadDialog
        open={isCreateTaskDialogOpen}
        onOpenChange={setIsCreateTaskDialogOpen}
        lead={lead}
      />

      <EditLeadDialog
        lead={lead}
        open={isEditLeadDialogOpen}
        onOpenChange={setIsEditLeadDialogOpen}
      />

      {selectedActivity && (
        <EditActivityDialog
          activity={selectedActivity}
          open={isEditActivityDialogOpen}
          onOpenChange={setIsEditActivityDialogOpen}
        />
      )}
    </DashboardLayout>
  );
}
