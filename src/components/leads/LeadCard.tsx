
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Mail, Phone, Building, DollarSign, Calendar, Edit, Eye, Plus, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import EditLeadDialog from './EditLeadDialog';
import CreateTaskFromLeadDialog from '../tasks/CreateTaskFromLeadDialog';
import { getLeadDisplayName } from '@/lib/leadUtils';

interface LeadCardProps {
  lead: any;
}

export default function LeadCard({ lead }: LeadCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const navigate = useNavigate();

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

  const handleTalkToLead = () => {
    if (lead.phone) {
      // Navegar para atendimento e iniciar nova conversa
      navigate('/atendimento', { state: { leadId: lead.id, phone: lead.phone } });
    } else {
      navigate('/atendimento');
    }
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          {/* Action Button - Mobile First */}
          <div className="flex gap-2 mb-3 sm:hidden">
            <Button 
              onClick={handleTalkToLead}
              size="sm" 
              className="bg-green-600 hover:bg-green-700 text-white flex items-center justify-center flex-1"
              title="Falar com o Lead"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Falar com o lead
            </Button>
          </div>

          <div className="flex items-start justify-between">
            <CardTitle className="text-lg font-semibold">{getLeadDisplayName(lead)}</CardTitle>
            <div className="hidden sm:flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/leads/${lead.id}`)}
                title="Ver detalhes"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Badge className={statusColors[lead.status]}>
              {statusLabels[lead.status]}
            </Badge>
            {lead.pipeline_stages && (
              <Badge variant="outline" style={{ borderColor: lead.pipeline_stages.color }}>
                {lead.pipeline_stages.name}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            {lead.email && (
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="h-4 w-4" />
                <span>{lead.email}</span>
              </div>
            )}

            {lead.phone && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="h-4 w-4" />
                <span>{lead.phone}</span>
              </div>
            )}

            {lead.company && (
              <div className="flex items-center gap-2 text-gray-600">
                <Building className="h-4 w-4" />
                <span>{lead.company}</span>
              </div>
            )}

            {lead.value && (
              <div className="flex items-center gap-2 text-gray-600">
                <DollarSign className="h-4 w-4" />
                <span>R$ {lead.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>
                Criado em {format(new Date(lead.created_at), "dd 'de' MMMM", { locale: ptBR })}
              </span>
            </div>
          </div>

          {/* Action Button - Desktop */}
          <div className="hidden sm:flex gap-2 pt-2 border-t">
            <Button 
              onClick={handleTalkToLead}
              size="sm" 
              className="bg-green-600 hover:bg-green-700 text-white flex items-center justify-center flex-1"
              title="Falar com o Lead"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Falar com o lead
            </Button>
          </div>
        </CardContent>
      </Card>

      <EditLeadDialog
        lead={lead}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />

      <CreateTaskFromLeadDialog
        lead={lead}
        open={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
      />
    </>
  );
}
