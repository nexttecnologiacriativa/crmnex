
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messageId } = await req.json();
    
    console.log('Delete message request:', { messageId });

    if (!messageId) {
      return new Response(
        JSON.stringify({ error: 'Message ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authToken) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar workspace e configuração do WhatsApp
    const { data: workspaceMember } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single();

    if (!workspaceMember) {
      return new Response(
        JSON.stringify({ error: 'No workspace found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: config } = await supabase
      .from('whatsapp_official_configs')
      .select('*')
      .eq('workspace_id', workspaceMember.workspace_id)
      .eq('is_active', true)
      .single();

    if (!config || !config.access_token) {
      return new Response(
        JSON.stringify({ error: 'WhatsApp not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Attempting to delete message via WhatsApp API...');

    // Primeiro, atualizar status da mensagem no banco (não depende da API)
    const { error: updateError } = await supabase
      .from('whatsapp_messages')
      .update({ 
        status: 'deleted',
        message_text: '🗑️ Esta mensagem foi apagada'
      })
      .eq('message_id', messageId);

    if (updateError) {
      console.error('Error updating message status:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update message status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Tentar apagar via API do WhatsApp (pode falhar, mas não é crítico)
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${messageId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${config.access_token}`,
          }
        }
      );

      const responseData = await response.text();
      console.log('Delete message API response:', response.status, responseData);

      if (!response.ok && response.status !== 404) {
        console.warn('WhatsApp API delete failed, but message marked as deleted locally. Status:', response.status);
      }
    } catch (apiError) {
      console.warn('WhatsApp API delete failed, but message marked as deleted locally:', apiError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Message deleted successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error deleting message:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to delete message', 
        details: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
