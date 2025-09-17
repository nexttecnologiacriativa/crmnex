import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MoreHorizontal, MessageCircle, FileText, ExternalLink } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDeleteLead } from '@/hooks/useLeads';
import EditLeadDialog from './EditLeadDialog';
import { getLeadDisplayName } from '@/lib/leadUtils';

interface Lead {
  id: string;
  workspace_id: string;
  pipeline_id: string;
  stage_id: string;
  assigned_to: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  value: number | null;
  currency: string;
  notes: string | null;
  status: string;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  custom_fields: any;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
  pipeline_stages?: {
    name: string;
    color: string;
  };
}

interface LeadsTableProps {
  leads: Lead[];
}

export default function LeadsTable({ leads }: LeadsTableProps) {
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const deleteLead = useDeleteLead();
  const navigate = useNavigate();

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este lead?')) {
      deleteLead.mutate(id);
    }
  };

  const handleWhatsApp = (lead: Lead) => {
    if (lead.phone) {
      const cleanPhone = lead.phone.replace(/\D/g, '');
      const message = `Olá ${getLeadDisplayName(lead)}, tudo bem? Entrei em contato através do nosso sistema.`;
      window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  const handleRowClick = (leadId: string, event: React.MouseEvent) => {
    // Evitar navegação se clicar em botões ou elementos interativos
    if ((event.target as HTMLElement).closest('button') || 
        (event.target as HTMLElement).closest('[role="button"]')) {
      return;
    }
    navigate(`/leads/${leadId}`);
  };

  return (
    <>
      <div className="rounded-lg border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-purple-50 to-blue-50">
              <TableHead className="font-semibold">Nome</TableHead>
              <TableHead className="font-semibold">Contato</TableHead>
              <TableHead className="font-semibold">Origem</TableHead>
              <TableHead className="font-semibold">Data</TableHead>
              <TableHead className="font-semibold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow 
                key={lead.id} 
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={(event) => handleRowClick(lead.id, event)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {getLeadDisplayName(lead)}
                        <ExternalLink className="h-3 w-3 text-gray-400" />
                      </div>
                      {lead.position && (
                        <div className="text-sm text-gray-500">{lead.position}</div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {lead.email && (
                      <div className="text-sm">{lead.email}</div>
                    )}
                    {lead.phone && (
                      <div className="text-sm text-gray-600">{lead.phone}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {lead.utm_source && (
                      <Badge variant="outline" className="text-xs">
                        {lead.utm_source}
                      </Badge>
                    )}
                    {lead.utm_campaign && (
                      <Badge variant="outline" className="text-xs">
                        {lead.utm_campaign}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {lead.phone && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWhatsApp(lead);
                        }}
                        className="h-8"
                      >
                        <MessageCircle className="h-3 w-3" />
                      </Button>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setEditingLead(lead);
                        }}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(lead.id);
                          }} 
                          className="text-red-600"
                        >
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editingLead && (
        <EditLeadDialog
          lead={editingLead}
          open={!!editingLead}
          onOpenChange={(open) => !open && setEditingLead(null)}
        />
      )}
    </>
  );
}
