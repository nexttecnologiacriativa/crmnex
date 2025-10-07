import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Plus, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  useLeadAppointments,
  useDeleteAppointment,
  type LeadAppointment,
  type AppointmentStatus,
} from '@/hooks/useLeadAppointments';
import { CreateAppointmentDialog } from './CreateAppointmentDialog';
import { EditAppointmentDialog } from './EditAppointmentDialog';
import { UpdateAppointmentStatusDialog } from './UpdateAppointmentStatusDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface LeadAppointmentsProps {
  leadId: string;
  leadName: string;
  leadPhone: string | null;
  workspaceId: string;
}

const statusConfig: Record<AppointmentStatus, { label: string; color: string; bgColor: string }> = {
  aguardando: { label: 'Aguardando', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  compareceu: { label: 'Compareceu', color: 'text-green-700', bgColor: 'bg-green-100' },
  nao_qualificado: { label: 'Não Qualificado', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  reagendado: { label: 'Reagendado', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  falhou: { label: 'Faltou', color: 'text-red-700', bgColor: 'bg-red-100' },
};

export function LeadAppointments({ leadId, leadName, leadPhone, workspaceId }: LeadAppointmentsProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<LeadAppointment | null>(null);

  const { data: appointments = [], isLoading } = useLeadAppointments(leadId);
  const deleteMutation = useDeleteAppointment();

  const handleEdit = (appointment: LeadAppointment) => {
    setSelectedAppointment(appointment);
    setEditDialogOpen(true);
  };

  const handleUpdateStatus = (appointment: LeadAppointment) => {
    setSelectedAppointment(appointment);
    setStatusDialogOpen(true);
  };

  const handleDelete = (appointment: LeadAppointment) => {
    setSelectedAppointment(appointment);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedAppointment) {
      deleteMutation.mutate(selectedAppointment.id);
      setDeleteDialogOpen(false);
      setSelectedAppointment(null);
    }
  };

  const formatDateTime = (date: string, time: string) => {
    try {
      const dateObj = new Date(`${date}T${time}`);
      return {
        date: format(dateObj, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
        time: format(dateObj, 'HH:mm', { locale: ptBR }),
      };
    } catch {
      return { date, time };
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando agendamentos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Agendamentos</h3>
        <Button onClick={() => setCreateDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>

      {appointments.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h4 className="font-medium mb-2">Nenhum agendamento</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Crie o primeiro agendamento para este lead
          </p>
          <Button onClick={() => setCreateDialogOpen(true)} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Criar Agendamento
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {appointments.map((appointment) => {
            const { date, time } = formatDateTime(appointment.scheduled_date, appointment.scheduled_time);
            const statusInfo = statusConfig[appointment.status];

            return (
              <Card key={appointment.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{appointment.title}</h4>
                      <Badge className={`${statusInfo.bgColor} ${statusInfo.color}`}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {date}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {time}
                      </div>
                    </div>
                    {appointment.description && (
                      <p className="text-sm text-muted-foreground mt-2">{appointment.description}</p>
                    )}
                    {appointment.notes && (
                      <div className="mt-2 p-2 bg-muted rounded-md">
                        <p className="text-xs font-medium mb-1">Observações:</p>
                        <p className="text-xs text-muted-foreground">{appointment.notes}</p>
                      </div>
                    )}
                    {appointment.reminder_sent && (
                      <p className="text-xs text-green-600 mt-2">✓ Lembrete enviado via WhatsApp</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {appointment.status === 'aguardando' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUpdateStatus(appointment)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(appointment)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(appointment)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Criado por {appointment.profiles?.full_name || 'Usuário'} em{' '}
                  {format(new Date(appointment.created_at), "dd/MM/yyyy 'às' HH:mm")}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <CreateAppointmentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        leadId={leadId}
        leadName={leadName}
        leadPhone={leadPhone}
        workspaceId={workspaceId}
      />

      {selectedAppointment && (
        <>
          <EditAppointmentDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            appointment={selectedAppointment}
          />

          <UpdateAppointmentStatusDialog
            open={statusDialogOpen}
            onOpenChange={setStatusDialogOpen}
            appointment={selectedAppointment}
          />

          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o agendamento "{selectedAppointment.title}"?
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
