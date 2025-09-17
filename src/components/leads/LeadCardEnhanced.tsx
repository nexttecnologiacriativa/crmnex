
import { useState } from 'react';
import { Mail, Phone, Building, DollarSign, Calendar, MoreHorizontal, MessageCircle, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useDeleteLead, useUpdateLead } from '@/hooks/useLeads';
import EditLeadDialog from './EditLeadDialog';
import { getLeadDisplayName } from '@/lib/leadUtils';

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  value: number | null;
  currency: string;
  status: string;
  created_at: string;
  notes: string | null;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  custom_fields: any;
  profiles?: {
    full_name: string;
  };
  pipeline_stages?: {
    name: string;
    color: string;
  };
}

interface LeadCardEnhancedProps {
  lead: Lead;
}

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

export default function LeadCardEnhanced({ lead }: LeadCardEnhancedProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [notes, setNotes] = useState(lead.notes || '');
  const deleteLead = useDeleteLead();
  const updateLead = useUpdateLead();

  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja excluir este lead?')) {
      deleteLead.mutate(lead.id);
    }
  };

  const handleSaveNotes = () => {
    updateLead.mutate({ id: lead.id, notes });
    setIsNotesDialogOpen(false);
  };

  const handleWhatsApp = () => {
    if (lead.phone) {
      const cleanPhone = lead.phone.replace(/\D/g, '');
      const message = `Olá ${getLeadDisplayName(lead)}, tudo bem? Entrei em contato através do nosso sistema.`;
      window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  const formatCurrency = (value: number | null, currency: string) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL'
    }).format(value);
  };

  return (
    <>
      <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group border-0 bg-gradient-to-br from-white to-gray-50 hover:from-purple-50 hover:to-blue-50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-gray-900 group-hover:text-premium-purple transition-colors">
                {getLeadDisplayName(lead)}
              </h3>
              {lead.position && (
                <p className="text-sm text-gray-600">{lead.position}</p>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {lead.email && (
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="h-4 w-4 mr-2 text-premium-purple" />
                <span className="truncate">{lead.email}</span>
              </div>
            )}
            
            {lead.phone && (
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="h-4 w-4 mr-2 text-premium-blue" />
                <span>{lead.phone}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-gray-500">
                <Calendar className="h-4 w-4 mr-1" />
                <span>{new Date(lead.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t">
            <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1">
                  <FileText className="h-4 w-4 mr-1" />
                  Notas
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Anotações - {getLeadDisplayName(lead)}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Adicione suas anotações sobre este lead..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsNotesDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveNotes} className="gradient-premium text-white">
                      Salvar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {lead.phone && (
              <Button 
                onClick={handleWhatsApp}
                size="sm" 
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                WhatsApp
              </Button>
            )}
          </div>

          {lead.profiles && (
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-500">
                Responsável: {lead.profiles.full_name}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <EditLeadDialog
        lead={lead}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </>
  );
}
