import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useWorkspace } from './useWorkspace';
import { toast } from 'sonner';

export type AppointmentStatus = 'aguardando' | 'compareceu' | 'nao_qualificado' | 'reagendado' | 'falhou';

export interface LeadAppointment {
  id: string;
  lead_id: string;
  workspace_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: AppointmentStatus;
  title: string;
  description: string | null;
  notes: string | null;
  created_by: string;
  reminder_sent: boolean;
  reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export interface CreateAppointmentData {
  lead_id: string;
  workspace_id: string;
  scheduled_date: string;
  scheduled_time: string;
  title: string;
  description?: string;
  created_by: string;
  send_reminder?: boolean;
}

export interface UpdateAppointmentData {
  id: string;
  scheduled_date?: string;
  scheduled_time?: string;
  title?: string;
  description?: string;
}

export interface UpdateAppointmentStatusData {
  id: string;
  status: AppointmentStatus;
  notes?: string;
}

export function useLeadAppointments(leadId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['lead-appointments', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_appointments')
        .select(`
          *,
          profiles:created_by (
            full_name,
            email
          )
        `)
        .eq('lead_id', leadId)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });
      
      if (error) throw error;
      return data as LeadAppointment[];
    },
    enabled: !!user && !!leadId,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateAppointmentData) => {
      const { send_reminder, ...appointmentData } = data;
      
      const { data: result, error } = await supabase
        .from('lead_appointments')
        .insert(appointmentData)
        .select()
        .single();
      
      if (error) throw error;
      
      // Enviar lembrete se solicitado
      if (send_reminder) {
        try {
          await supabase.functions.invoke('send-appointment-reminder', {
            body: {
              lead_id: data.lead_id,
              appointment_id: result.id,
            },
          });
        } catch (reminderError) {
          console.error('Erro ao enviar lembrete:', reminderError);
          toast.warning('Agendamento criado, mas não foi possível enviar o lembrete');
        }
      }
      
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lead-appointments', data.lead_id] });
      queryClient.invalidateQueries({ queryKey: ['lead-activities', data.lead_id] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline', data.lead_id] });
      toast.success('Agendamento criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar agendamento: ' + error.message);
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateAppointmentData) => {
      const { data: result, error } = await supabase
        .from('lead_appointments')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lead-appointments', data.lead_id] });
      toast.success('Agendamento atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar agendamento: ' + error.message);
    },
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status, notes }: UpdateAppointmentStatusData) => {
      const { data: result, error } = await supabase
        .from('lead_appointments')
        .update({ status, notes })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lead-appointments', data.lead_id] });
      queryClient.invalidateQueries({ queryKey: ['lead-activities', data.lead_id] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline', data.lead_id] });
      toast.success('Status do agendamento atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Primeiro buscar o lead_id para invalidar queries
      const { data: appointment } = await supabase
        .from('lead_appointments')
        .select('lead_id')
        .eq('id', id)
        .single();
      
      const { error } = await supabase
        .from('lead_appointments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return appointment;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['lead-appointments', data.lead_id] });
      }
      toast.success('Agendamento excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir agendamento: ' + error.message);
    },
  });
}

export function useAppointmentStats() {
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ['appointment-stats', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;
      
      const { data, error } = await supabase.rpc('get_appointment_stats', {
        p_workspace_id: currentWorkspace.id,
      });
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace?.id,
  });
}
