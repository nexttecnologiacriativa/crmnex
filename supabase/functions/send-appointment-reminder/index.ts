import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { lead_id, appointment_id } = await req.json();

    console.log('Enviando lembrete de agendamento:', { lead_id, appointment_id });

    // Buscar informações do lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('name, phone')
      .eq('id', lead_id)
      .single();

    if (leadError || !lead) {
      throw new Error('Lead não encontrado');
    }

    if (!lead.phone) {
      throw new Error('Lead não possui telefone cadastrado');
    }

    // Buscar informações do agendamento
    const { data: appointment, error: appointmentError } = await supabase
      .from('lead_appointments')
      .select('title, scheduled_date, scheduled_time, workspace_id')
      .eq('id', appointment_id)
      .single();

    if (appointmentError || !appointment) {
      throw new Error('Agendamento não encontrado');
    }

    // Formatar data e hora
    const dateObj = new Date(`${appointment.scheduled_date}T${appointment.scheduled_time}`);
    const formattedDate = dateObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const formattedTime = dateObj.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Buscar configuração do WhatsApp do workspace
    const { data: evolutionConfig } = await supabase
      .from('whatsapp_evolution_configs')
      .select('api_url, global_api_key')
      .eq('workspace_id', appointment.workspace_id)
      .single();

    const { data: officialConfig } = await supabase
      .from('whatsapp_official_configs')
      .select('access_token, phone_number_id')
      .eq('workspace_id', appointment.workspace_id)
      .single();

    // Buscar instância ativa do Evolution API
    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('instance_name, status')
      .eq('workspace_id', appointment.workspace_id)
      .eq('status', 'connected')
      .maybeSingle();

    // Montar mensagem de lembrete
    const message = `Olá ${lead.name}! 👋

Este é um lembrete da sua reunião agendada:

📅 Data: ${formattedDate}
⏰ Horário: ${formattedTime}
📋 Assunto: ${appointment.title}

Aguardamos você! 😊`;

    let reminderSent = false;

    // Tentar enviar via Evolution API
    if (evolutionConfig && instance && instance.instance_name) {
      try {
        const phoneNumber = lead.phone.replace(/\D/g, '');
        const evolutionUrl = `${evolutionConfig.api_url}/message/sendText/${instance.instance_name}`;
        
        const evolutionResponse = await fetch(evolutionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionConfig.global_api_key,
          },
          body: JSON.stringify({
            number: `${phoneNumber}@s.whatsapp.net`,
            text: message,
          }),
        });

        if (evolutionResponse.ok) {
          reminderSent = true;
          console.log('Lembrete enviado via Evolution API');
        }
      } catch (evolutionError) {
        console.error('Erro ao enviar via Evolution:', evolutionError);
      }
    }

    // Tentar enviar via WhatsApp Official se Evolution falhou
    if (!reminderSent && officialConfig) {
      try {
        const phoneNumber = lead.phone.replace(/\D/g, '');
        const officialUrl = `https://graph.facebook.com/v17.0/${officialConfig.phone_number_id}/messages`;
        
        const officialResponse = await fetch(officialUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${officialConfig.access_token}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phoneNumber,
            type: 'text',
            text: { body: message },
          }),
        });

        if (officialResponse.ok) {
          reminderSent = true;
          console.log('Lembrete enviado via WhatsApp Official');
        }
      } catch (officialError) {
        console.error('Erro ao enviar via WhatsApp Official:', officialError);
      }
    }

    if (!reminderSent) {
      throw new Error('Não foi possível enviar o lembrete. Verifique as configurações do WhatsApp.');
    }

    // Atualizar status de envio do lembrete
    await supabase
      .from('lead_appointments')
      .update({
        reminder_sent: true,
        reminder_sent_at: new Date().toISOString(),
      })
      .eq('id', appointment_id);

    return new Response(
      JSON.stringify({ success: true, message: 'Lembrete enviado com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao enviar lembrete:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
