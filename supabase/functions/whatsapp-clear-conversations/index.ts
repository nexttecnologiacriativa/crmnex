
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authorization' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      )
    }

    const { workspace_id } = await req.json()

    if (!workspace_id) {
      throw new Error('workspace_id é obrigatório')
    }

    console.log('Clearing conversations for workspace:', workspace_id)

    // Primeiro, buscar todos os IDs das conversas do workspace
    const { data: conversations, error: conversationsSelectError } = await supabase
      .from('whatsapp_conversations')
      .select('id')
      .eq('workspace_id', workspace_id)

    if (conversationsSelectError) {
      console.error('Error selecting conversations:', conversationsSelectError)
      throw conversationsSelectError
    }

    if (!conversations || conversations.length === 0) {
      console.log('No conversations found for workspace')
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhuma conversa encontrada para apagar' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    const conversationIds = conversations.map(c => c.id)
    console.log('Found conversations to delete:', conversationIds.length)

    // Deletar todas as mensagens das conversas
    const { error: messagesError } = await supabase
      .from('whatsapp_messages')
      .delete()
      .in('conversation_id', conversationIds)

    if (messagesError) {
      console.error('Error deleting messages:', messagesError)
      throw messagesError
    }

    console.log('Messages deleted successfully')

    // Depois, deletar todas as conversas
    const { error: conversationsError } = await supabase
      .from('whatsapp_conversations')
      .delete()
      .eq('workspace_id', workspace_id)

    if (conversationsError) {
      console.error('Error deleting conversations:', conversationsError)
      throw conversationsError
    }

    console.log('All conversations cleared successfully')

    return new Response(
      JSON.stringify({ success: true, message: 'Todas as conversas foram apagadas' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
