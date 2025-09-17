import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Função para enviar resposta via WhatsApp usando Evolution API
 * @param threadId - ID da conversa (remoteJid)
 * @param text - Texto da mensagem a ser enviada
 */
async function sendWhatsAppReply(threadId: string, text: string) {
  try {
    // Extrair número do telefone do threadId (remover @s.whatsapp.net)
    const phoneNumber = threadId.replace('@s.whatsapp.net', '');
    
    // Obter variáveis de ambiente
    const evoServerUrl = Deno.env.get('EVO_SERVER_URL');
    const evoInstanceId = Deno.env.get('EVO_INSTANCE_ID');
    const evoApiKey = Deno.env.get('EVO_API_KEY');

    if (!evoServerUrl || !evoInstanceId || !evoApiKey) {
      throw new Error('Missing Evolution API environment variables');
    }

    // Construir URL da API
    const apiUrl = `${evoServerUrl}/message/sendText/${evoInstanceId}`;
    
    // Dados da mensagem
    const messageData = {
      number: phoneNumber,
      text: text
    };

    console.log('Sending WhatsApp message:', {
      url: apiUrl,
      data: messageData
    });

    // Fazer requisição para Evolution API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evoApiKey
      },
      body: JSON.stringify(messageData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Evolution API request failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('WhatsApp message sent successfully:', result);
    
    return result;

  } catch (error) {
    console.error('Error sending WhatsApp reply:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    const { threadId, text } = await req.json();

    // Validate required parameters
    if (!threadId || !text) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: threadId and text' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Send WhatsApp reply
    const result = await sendWhatsAppReply(threadId, text);

    // Optionally save the sent message to database
    try {
      await supabase
        .from('whatsapp_webhook_messages')
        .insert({
          thread_id: threadId,
          from_me: true,
          push_name: 'Bot',
          message_type: 'conversation',
          text: text,
          timestamp: Date.now(),
          raw: { bot_reply: true, evolution_result: result }
        });
    } catch (dbError) {
      console.error('Error saving sent message to database:', dbError);
      // Don't fail the request if database save fails
    }

    return new Response(
      JSON.stringify({ ok: true, result }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in send WhatsApp reply:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send WhatsApp reply', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});