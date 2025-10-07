import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useUpdateAppointmentStatus, type LeadAppointment, type AppointmentStatus } from '@/hooks/useLeadAppointments';

interface UpdateAppointmentStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: LeadAppointment;
}

const statusOptions: { value: AppointmentStatus; label: string; description: string }[] = [
  {
    value: 'compareceu',
    label: '✅ Compareceu',
    description: 'Lead participou da reunião',
  },
  {
    value: 'nao_qualificado',
    label: '⚠️ Não Qualificado',
    description: 'Lead não tem perfil adequado',
  },
  {
    value: 'reagendado',
    label: '🔄 Reagendado',
    description: 'Reunião foi remarcada',
  },
  {
    value: 'falhou',
    label: '❌ Faltou',
    description: 'Lead não compareceu',
  },
];

export function UpdateAppointmentStatusDialog({
  open,
  onOpenChange,
  appointment,
}: UpdateAppointmentStatusDialogProps) {
  const updateStatusMutation = useUpdateAppointmentStatus();
  const [status, setStatus] = useState<AppointmentStatus>('compareceu');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updateStatusMutation.mutate(
      {
        id: appointment.id,
        status,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          setNotes('');
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Atualizar Status do Agendamento</DialogTitle>
          <p className="text-sm text-muted-foreground">{appointment.title}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Novo Status *</Label>
            <RadioGroup value={status} onValueChange={(value) => setStatus(value as AppointmentStatus)}>
              {statusOptions.map((option) => (
                <div key={option.value} className="flex items-start space-x-3 space-y-0 p-3 border rounded-lg hover:bg-accent">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <div className="flex-1">
                    <Label htmlFor={option.value} className="font-medium cursor-pointer">
                      {option.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione detalhes sobre o resultado do agendamento..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateStatusMutation.isPending}>
              {updateStatusMutation.isPending ? 'Atualizando...' : 'Atualizar Status'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
