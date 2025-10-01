
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getLeadDisplayName } from '@/lib/leadUtils';
import { User, Mail, Phone, Building, DollarSign, Calendar, Save, Edit, X } from 'lucide-react';
import { useUpdateLead } from '@/hooks/useLeads';
import { useLeadActivities, useCreateLeadActivity } from '@/hooks/useLeadActivities';
import { usePipelines, usePipelineStages } from '@/hooks/usePipeline';
import { useUpdateLeadPipeline } from '@/hooks/useLeadPipelineRelations';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import LeadMultiplePipelinesManager from '@/components/leads/LeadMultiplePipelinesManager';

interface LeadDataModalProps {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LeadDataModal({ leadId, open, onOpenChange }: LeadDataModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedLead, setEditedLead] = useState<any>({});
  const [notes, setNotes] = useState('');
  const [newActivity, setNewActivity] = useState({ type: '', description: '' });
  
  const { currentWorkspace } = useWorkspace();
  const updateLead = useUpdateLead();
  const updateLeadPipeline = useUpdateLeadPipeline();
  const createActivity = useCreateLeadActivity();
  const { data: activities = [] } = useLeadActivities(leadId || '');
  const { data: pipelines = [] } = usePipelines(currentWorkspace?.id);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const { data: stages } = usePipelineStages(selectedPipelineId);

  // Buscar dados do lead
  const { data: leadData } = useQuery({
    queryKey: ['lead-detail', leadId],
    queryFn: async () => {
      if (!leadId) return null;
      
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          pipeline_stages (
            id,
            name,
            color
          ),
          lead_tag_relations (
            lead_tags (
              id,
              name,
              color
            )
          )
        `)
        .eq('id', leadId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!leadId && open,
  });

  const defaultPipeline = pipelines.find(p => p.is_default);
  const pipelineStages = defaultPipeline?.pipeline_stages || [];

  useEffect(() => {
    if (leadData) {
      setEditedLead(leadData);
      setNotes(leadData.notes || '');
      setSelectedPipelineId(leadData.pipeline_id || '');
      setIsEditing(false);
    }
  }, [leadData]);

  if (!leadData) return null;

  const statusColors = {
    new: 'bg-blue-100 text-blue-800',
    contacted: 'bg-yellow-100 text-yellow-800',
    qualified: 'bg-purple-100 text-purple-800',
    proposal: 'bg-orange-100 text-orange-800',
    negotiation: 'bg-red-100 text-red-800',
    closed_won: 'bg-green-100 text-green-800',
    closed_lost: 'bg-gray-100 text-gray-800',
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

  const handleSave = async () => {
    try {
      await updateLead.mutateAsync({
        id: leadData.id,
        ...editedLead,
        notes
      });
      setIsEditing(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating lead:', error);
    }
  };

  const handleCancel = () => {
    setEditedLead(leadData);
    setNotes(leadData?.notes || '');
    setIsEditing(false);
  };

  const handleAddActivity = async () => {
    if (!newActivity.type || !newActivity.description.trim()) return;
    
    try {
      await createActivity.mutateAsync({
        lead_id: leadData.id,
        activity_type: newActivity.type,
        title: newActivity.type,
        description: newActivity.description
      });
      setNewActivity({ type: '', description: '' });
    } catch (error) {
      console.error('Error creating activity:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {isEditing ? (
                <Input
                  value={editedLead.name || ''}
                  onChange={(e) => setEditedLead({...editedLead, name: e.target.value})}
                  className="text-lg font-semibold"
                />
              ) : (
                getLeadDisplayName(leadData)
              )}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700">
                    <Save className="h-4 w-4 mr-1" />
                    Salvar
                  </Button>
                  <Button onClick={handleCancel} variant="outline" size="sm">
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
              <TabsTrigger value="activities">Atividades</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-4">
              <div className="space-y-6">
            {/* Status e Pipeline */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                {isEditing ? (
                  <Select 
                    value={editedLead.status || 'new'} 
                    onValueChange={(value) => setEditedLead({...editedLead, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1">
                    <Badge className={statusColors[leadData.status as keyof typeof statusColors] || statusColors.new}>
                      {statusLabels[leadData.status as keyof typeof statusLabels] || 'Novo'}
                    </Badge>
                  </div>
                )}
              </div>
              
              <div>
                <Label>Estágio do Pipeline</Label>
                {isEditing ? (
                  <Select 
                    value={editedLead.stage_id || ''} 
                    onValueChange={(value) => setEditedLead({...editedLead, stage_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um estágio" />
                    </SelectTrigger>
                    <SelectContent>
                      {pipelineStages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1">
                    {leadData.pipeline_stages && (
                      <Badge variant="outline" style={{ borderColor: leadData.pipeline_stages.color }}>
                        {leadData.pipeline_stages.name}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Tags do Lead */}
            {leadData.lead_tag_relations?.length > 0 && (
              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {leadData.lead_tag_relations.map((relation: any) => (
                    <Badge
                      key={relation.lead_tags.id}
                      variant="outline"
                      style={{ 
                        borderColor: relation.lead_tags.color,
                        color: relation.lead_tags.color
                      }}
                    >
                      {relation.lead_tags.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Informações básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={editedLead.email || ''}
                    onChange={(e) => setEditedLead({...editedLead, email: e.target.value})}
                  />
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{leadData.email || 'Não informado'}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Telefone</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    value={editedLead.phone || ''}
                    onChange={(e) => setEditedLead({...editedLead, phone: e.target.value})}
                  />
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{leadData.phone || 'Não informado'}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="company">Empresa</Label>
                {isEditing ? (
                  <Input
                    id="company"
                    value={editedLead.company || ''}
                    onChange={(e) => setEditedLead({...editedLead, company: e.target.value})}
                  />
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <Building className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{leadData.company || 'Não informado'}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="value">Valor</Label>
                {isEditing ? (
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    value={editedLead.value || ''}
                    onChange={(e) => setEditedLead({...editedLead, value: parseFloat(e.target.value) || 0})}
                  />
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {leadData.value ? `R$ ${leadData.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não informado'}
                    </span>
                  </div>
                )}
              </div>

              <div className="col-span-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    Criado em {format(new Date(leadData.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>
            </div>

            {/* Campos customizados */}
            {leadData.custom_fields && Object.keys(leadData.custom_fields).length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Campos Personalizados</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(leadData.custom_fields).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 p-3 rounded">
                      <span className="text-sm font-medium text-gray-700">{key}:</span>
                      <span className="text-sm ml-2">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* UTM Parameters */}
            {(leadData.utm_source || leadData.utm_medium || leadData.utm_campaign) && (
              <div>
                <h3 className="font-semibold mb-3">Origem do Lead</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {leadData.utm_source && <div><strong>Fonte:</strong> {leadData.utm_source}</div>}
                  {leadData.utm_medium && <div><strong>Mídia:</strong> {leadData.utm_medium}</div>}
                  {leadData.utm_campaign && <div><strong>Campanha:</strong> {leadData.utm_campaign}</div>}
                  {leadData.utm_term && <div><strong>Termo:</strong> {leadData.utm_term}</div>}
                  {leadData.utm_content && <div><strong>Conteúdo:</strong> {leadData.utm_content}</div>}
                </div>
              </div>
            )}

            {/* Notas */}
            <div>
              <Label htmlFor="notes">Anotações</Label>
              <Textarea
                id="notes"
                placeholder="Adicione suas anotações sobre este lead..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full mt-1"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pipelines">
          <LeadMultiplePipelinesManager
            leadId={leadId!}
            workspaceId={currentWorkspace?.id || ''}
          />
        </TabsContent>

        <TabsContent value="activities">
          <div>
            <h3 className="font-semibold mb-3">Atividades</h3>
          
            {/* Adicionar nova atividade */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium mb-2">Nova Atividade</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Select value={newActivity.type} onValueChange={(value) => setNewActivity({...newActivity, type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Ligação</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Reunião</SelectItem>
                    <SelectItem value="note">Anotação</SelectItem>
                    <SelectItem value="task">Tarefa</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Descrição da atividade..."
                  value={newActivity.description}
                  onChange={(e) => setNewActivity({...newActivity, description: e.target.value})}
                />
                <Button onClick={handleAddActivity} disabled={!newActivity.type || !newActivity.description.trim()}>
                  Adicionar
                </Button>
              </div>
            </div>

            {/* Lista de atividades */}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {activities.map((activity) => (
                <div key={activity.id} className="bg-white p-3 rounded border">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline">{activity.activity_type}</Badge>
                    <span className="text-xs text-gray-500">
                      {format(new Date(activity.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{activity.description}</p>
                </div>
              ))}
              
              {activities.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Nenhuma atividade registrada ainda.
                </p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
