import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MoreVertical, MessageCircle, Eye, Tag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AvatarInitials } from '@/components/ui/avatar-initials';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLeadTagRelations } from '@/hooks/useLeadTags';
import { getLeadDisplayName } from '@/lib/leadUtils';

interface LeadKanbanCardProps {
  lead: any;
  isSelected?: boolean;
  onSelect?: (leadId: string, selected: boolean) => void;
  selectionMode?: boolean;
}

const pipelineTagColors: Record<string, string> = {
  aberto: '#3b82f6',
  ganho: '#22c55e',
  perdido: '#ef4444',
};

const pipelineTagLabels: Record<string, string> = {
  aberto: 'Aberto',
  ganho: 'Pago',
  perdido: 'Perdido',
};

export default function LeadKanbanCard({
  lead,
  isSelected = false,
  onSelect,
  selectionMode = false
}: LeadKanbanCardProps) {
  const navigate = useNavigate();
  const {
    data: leadTagRelations = []
  } = useLeadTagRelations(lead.id);

  // Filtrar tags válidas sem duplicatas
  const validTags = leadTagRelations
    .filter(relation => relation && relation.lead_tags)
    .map(relation => relation.lead_tags)
    .filter((tag, index, self) => tag && self.findIndex(t => t && t.id === tag.id) === index);

  const handleCardClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    
    // Se estiver em modo de seleção, apenas selecionar/deselecionar
    if (selectionMode && onSelect) {
      if (!target.closest('input[type="checkbox"]') && !target.closest('button')) {
        onSelect(lead.id, !isSelected);
        return;
      }
    }

    // Verificar se é um botão ou elemento interativo direto
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }
    
    // Se não estiver em modo de seleção, navegar normalmente
    if (!selectionMode) {
      navigate(`/leads/${lead.id}`);
    }
  };

  const pipelineTag = lead.pipeline_tag || 'aberto';

  return (
    <Card 
      className={`mb-2 hover:shadow-sm transition-shadow bg-white cursor-pointer ${isSelected ? 'ring-2 ring-purple-500 bg-purple-50' : ''}`} 
      onClick={handleCardClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Checkbox de seleção */}
          {selectionMode && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect?.(lead.id, checked as boolean)}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          
          {/* Avatar com foto do WhatsApp ou iniciais */}
          {lead.profile_picture_url ? (
            <img 
              src={lead.profile_picture_url} 
              alt={getLeadDisplayName(lead)}
              className="w-9 h-9 rounded-full object-cover flex-shrink-0"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
            style={{ display: lead.profile_picture_url ? 'none' : 'flex' }}
          >
            <AvatarInitials name={getLeadDisplayName(lead)} />
          </div>
          
          {/* Conteúdo principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm text-gray-900 truncate">
                {getLeadDisplayName(lead)}
              </span>
              
              {/* Menu discreto */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 opacity-40 hover:opacity-100 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/leads/${lead.id}`)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Ver detalhes
                  </DropdownMenuItem>
                  {lead.phone && (
                    <DropdownMenuItem 
                      onClick={() => navigate('/atendimento', { state: { leadId: lead.id, phone: lead.phone } })}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Falar no WhatsApp
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Tags na linha de baixo */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {/* Tag de status do pipeline (aberto/ganho/perdido) */}
              <Badge 
                variant="secondary" 
                className="text-[10px] px-1.5 py-0 h-5"
                style={{
                  backgroundColor: pipelineTagColors[pipelineTag] + '20',
                  color: pipelineTagColors[pipelineTag]
                }}
              >
                {pipelineTagLabels[pipelineTag] || 'Aberto'}
              </Badge>
              
              {/* Primeira tag atribuída */}
              {validTags[0] && (
                <Badge 
                  variant="outline" 
                  className="text-[10px] px-1.5 py-0 h-5 truncate max-w-[100px]"
                  style={{ borderColor: validTags[0].color, color: validTags[0].color }}
                >
                  <Tag className="h-2.5 w-2.5 mr-0.5" />
                  {validTags[0].name}
                </Badge>
              )}
              
              {/* Tempo na etapa (discreto) */}
              {lead.pipeline_stage_updated_at && (
                <span className="text-[10px] text-gray-400 ml-auto">
                  {formatDistanceToNow(new Date(lead.pipeline_stage_updated_at), { 
                    locale: ptBR, 
                    addSuffix: false 
                  }).replace('cerca de ', '~').replace('menos de ', '~')}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
