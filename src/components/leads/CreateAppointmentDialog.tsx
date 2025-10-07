import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { useCreateAppointment } from '@/hooks/useLeadAppointments';

interface CreateAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  leadPhone: string | null;
  workspaceId: string;
}

export function CreateAppointmentDialog({
  open,
  onOpenChange,
  leadId,
  leadName,
  leadPhone,
  workspaceId,
}: CreateAppointmentDialogProps) {
  const { user } = useAuth();
  const createMutation = useCreateAppointment();

  const [formData, setFormData] = useState({
    title: '',
    scheduled_date: '',
    scheduled_time: '',
    description: '',
    send_reminder: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) return;

    createMutation.mutate(
      {
        lead_id: leadId,
        workspace_id: workspaceId,
        created_by: user.id,
        title: formData.title,
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time,
        description: formData.description || undefined,
        send_reminder: formData.send_reminder,
      },
      {
        onSuccess: () => {
          setFormData({
            title: '',
            scheduled_date: '',
            scheduled_time: '',
            description: '',
            send_reminder: false,
          });
          onOpenChange(false);
        },
      }
    );
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Agendamento</DialogTitle>
          <p className="text-sm text-muted-foreground">Lead: {leadName}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Título da Reunião *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Apresentação do produto"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                min={today}
                required
              />
            </div>

            <div>
              <Label htmlFor="time">Hora *</Label>
              <Input
                id="time"
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalhes do agendamento..."
              rows={3}
            />
          </div>

          {leadPhone && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="send_reminder"
                checked={formData.send_reminder}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, send_reminder: checked as boolean })
                }
              />
              <label
                htmlFor="send_reminder"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Enviar lembrete no WhatsApp
              </label>
            </div>
          )}

          {!leadPhone && (
            <p className="text-xs text-muted-foreground">
              * Lead sem telefone cadastrado. Não será possível enviar lembrete.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Criando...' : 'Criar Agendamento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
