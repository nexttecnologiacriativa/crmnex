import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Mail, Phone, Building, DollarSign, Calendar, Edit, Plus, Globe, Tag, Check, Clock, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import EditLeadDialog from '../leads/EditLeadDialog';
import CreateTaskFromLeadDialog from '../tasks/CreateTaskFromLeadDialog';
import LeadAssigneeSelector from '../leads/LeadAssigneeSelector';
import PipelineTagSelector from './PipelineTagSelector';
import { useLeadTagRelations } from '@/hooks/useLeadTags';
import { getLeadDisplayName } from '@/lib/leadUtils';
interface LeadKanbanCardProps {
  lead: any;
  isSelected?: boolean;
  onSelect?: (leadId: string, selected: boolean) => void;
  selectionMode?: boolean;
}
export default function LeadKanbanCard({
  lead,
  isSelected = false,
  onSelect,
  selectionMode = false
}: LeadKanbanCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const navigate = useNavigate();
  const {
    data: leadTagRelations = []
  } = useLeadTagRelations(lead.id);

  // Filtrar tags válidas sem duplicatas
  const validTags = leadTagRelations.filter(relation => relation && relation.lead_tags).map(relation => relation.lead_tags).filter((tag, index, self) => tag && self.findIndex(t => t && t.id === tag.id) === index);
  const handleCardClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    
    // Se estiver em modo de seleção, apenas selecionar/deselecionar
    if (selectionMode && onSelect) {
      // Verificar se não é um checkbox ou botão
      if (!target.closest('input[type="checkbox"]') && !target.closest('button')) {
        onSelect(lead.id, !isSelected);
        return;
      }
    }

    // Verificar se é um botão ou elemento interativo direto
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }

    // Verificar se é o seletor de assignee
    if (target.closest('[data-assignee-selector]')) {
      return;
    }
    
    // Se não estiver em modo de seleção, navegar normalmente
    if (!selectionMode) {
      navigate(`/leads/${lead.id}`);
    }
  };
  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };
  return <>
      <Card className={`mb-3 hover:shadow-md transition-shadow bg-white cursor-pointer ${isSelected ? 'ring-2 ring-purple-500 bg-purple-50' : ''}`} onClick={handleCardClick}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {selectionMode && (
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelect?.(lead.id, checked as boolean)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                <CardTitle className="text-sm font-semibold text-gray-900">{getLeadDisplayName(lead)}</CardTitle>
              </div>
              
              {/* Dono do Lead - posicionado logo após o nome */}
              <div className="mb-2" data-assignee-selector>
                <LeadAssigneeSelector leadId={lead.id} currentAssignee={lead.assigned_to} />
              </div>

              {lead.utm_source && <div className="text-xs text-gray-500 mb-2">
                  <Globe className="h-3 w-3 inline mr-1" />
                  {lead.utm_source}
                </div>}
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={e => handleButtonClick(e, () => {
                  navigate('/atendimento', { state: { leadId: lead.id, phone: lead.phone } });
                })} 
                className="h-6 px-2 bg-green-100 hover:bg-green-200 text-green-700"
                title="Falar com o lead"
              >
                <MessageCircle className="h-3 w-3 mr-1" />
                <span className="text-xs">Falar</span>
              </Button>
            </div>
          </div>
          
          {/* Pipeline Tag */}
          <div className="mb-2">
            <PipelineTagSelector leadId={lead.id} currentTag={lead.pipeline_tag} />
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-2">
          <div className="space-y-1 text-xs">
            {lead.email && <div className="flex items-center gap-1 text-gray-600">
                <Mail className="h-3 w-3" />
                <span className="truncate">{lead.email}</span>
              </div>}

            {lead.phone && <div className="flex items-center gap-1 text-gray-600">
                <Phone className="h-3 w-3" />
                <span>{lead.phone}</span>
              </div>}

            {lead.company && <div className="flex items-center gap-0 text-gray-600">
                <Building className="h-3 w-3" />
                <span className="truncate">{lead.company}</span>
              </div>}

            {lead.value && <div className="flex items-center gap-1 text-green-600">
                <DollarSign className="h-3 w-3" />
                <span className="font-medium">R$ {lead.value.toLocaleString('pt-BR', {
                minimumFractionDigits: 2
              })}</span>
              </div>}

            <div className="flex items-center gap-1 text-gray-400">
              <Calendar className="h-3 w-3" />
              <span>
                {format(new Date(lead.created_at), "dd/MM 'às' HH:mm", {
                locale: ptBR
              })}
              </span>
            </div>

            {/* Tempo na etapa atual */}
            {lead.pipeline_stage_updated_at && (
              <div className="flex items-center gap-1 text-blue-600 text-xs">
                <Clock className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(new Date(lead.pipeline_stage_updated_at), {
                    locale: ptBR,
                    addSuffix: true
                  }).replace('há ', '').replace('cerca de ', '').replace('menos de ', '~')} nesta etapa
                </span>
              </div>
            )}

            {/* Tags do Lead - abaixo da data */}
            {validTags && validTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {validTags.slice(0, 2).map(tag => (
                  <Badge key={tag.id} variant="secondary" className="text-[11px] px-1.5 py-0.5 h-4" style={{
                    backgroundColor: tag.color + '15',
                    color: tag.color,
                    borderColor: tag.color
                  }}>
                    <Tag className="h-2.5 w-2.5 mr-0.5" />
                    {tag.name}
                  </Badge>
                ))}
                {validTags.length > 2 && (
                  <Badge variant="outline" className="text-[11px] px-1.5 py-0.5 h-4">
                    +{validTags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <EditLeadDialog lead={lead} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} />

      <CreateTaskFromLeadDialog lead={lead} open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen} />
    </>;
}