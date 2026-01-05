import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useMergeLeads } from '@/hooks/useMergeLeads';
import { formatPhoneDisplay } from '@/lib/phone';
import { Loader2, User, Mail, Phone, Building2, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  value: number | null;
  created_at: string;
  updated_at: string;
}

interface MergeLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: Lead[];
  onSuccess?: () => void;
}

export default function MergeLeadsDialog({ open, onOpenChange, leads, onSuccess }: MergeLeadsDialogProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string>(leads[0]?.id || '');
  const { mutate: mergeLeads, isPending } = useMergeLeads();

  const handleMerge = () => {
    if (!selectedTargetId) return;

    // Merge all non-selected leads into the selected one
    const sourceLeads = leads.filter(l => l.id !== selectedTargetId);
    
    // Merge one by one (sequentially for safety)
    const mergeNext = (index: number) => {
      if (index >= sourceLeads.length) {
        onOpenChange(false);
        onSuccess?.();
        return;
      }

      mergeLeads(
        { sourceLeadId: sourceLeads[index].id, targetLeadId: selectedTargetId },
        {
          onSuccess: () => mergeNext(index + 1),
        }
      );
    };

    mergeNext(0);
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const formatValue = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mesclar Leads Duplicados</DialogTitle>
          <DialogDescription>
            Selecione o lead principal. Os dados dos outros leads serão mesclados a ele e os duplicados serão excluídos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={selectedTargetId} onValueChange={setSelectedTargetId}>
            {leads.map((lead) => (
              <div key={lead.id} className="flex items-start gap-3">
                <RadioGroupItem value={lead.id} id={lead.id} className="mt-4" />
                <Label htmlFor={lead.id} className="flex-1 cursor-pointer">
                  <Card className={`transition-colors ${selectedTargetId === lead.id ? 'border-primary bg-primary/5' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-lg">{lead.name}</span>
                        {selectedTargetId === lead.id && (
                          <Badge variant="default">Principal</Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{lead.phone ? formatPhoneDisplay(lead.phone) : '-'}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{lead.email || '-'}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>{lead.company || '-'}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          <span>{formatValue(lead.value)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 col-span-2">
                          <Calendar className="h-4 w-4" />
                          <span>Criado em {formatDate(lead.created_at)}</span>
                        </div>
                        
                        {lead.source && (
                          <div className="col-span-2">
                            <Badge variant="secondary">{lead.source}</Badge>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 text-sm">
          <p className="font-medium mb-2">O que acontecerá:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Dados vazios do lead principal serão preenchidos com dados dos outros leads</li>
            <li>Notas serão concatenadas</li>
            <li>Tags, atividades, tarefas e agendamentos serão transferidos</li>
            <li>Conversas do WhatsApp serão unificadas</li>
            <li>Os leads duplicados serão excluídos permanentemente</li>
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleMerge} disabled={isPending || leads.length < 2}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Mesclar {leads.length} Leads
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
