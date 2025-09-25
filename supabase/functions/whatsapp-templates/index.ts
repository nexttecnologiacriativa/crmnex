
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
    const body = await req.json();
    const { action } = body;
    
    console.log('Template action:', action, body);

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
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar configuração do WhatsApp
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

    if (!config || !config.access_token || !config.business_account_id) {
      return new Response(
        JSON.stringify({ error: 'WhatsApp not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'list') {
      // Listar templates
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${config.business_account_id}/message_templates?limit=100`,
        {
          headers: {
            'Authorization': `Bearer ${config.access_token}`,
          }
        }
      );

      const data = await response.json();
      console.log('Templates from Meta:', data);

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch templates');
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          templates: data.data || []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'create') {
      // Criar template
      const { name, category, language, header, bodyContent, footer, buttons } = body;
      
      console.log('Creating template with data:', {
        name,
        category,
        language,
        header,
        body: bodyContent,
        footer,
        buttons
      });

      const components = [];

      if (header) {
        components.push({
          type: 'HEADER',
          format: 'TEXT',
          text: header
        });
      }

      components.push({
        type: 'BODY',
        text: bodyContent
      });

      if (footer) {
        components.push({
          type: 'FOOTER',
          text: footer
        });
      }

      if (buttons && buttons.length > 0) {
        components.push({
          type: 'BUTTONS',
          buttons: buttons.map((button: string, index: number) => ({
            type: 'QUICK_REPLY',
            text: button
          }))
        });
      }

      const payload = {
        name,
        category: category.toUpperCase(),
        language,
        components
      };

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${config.business_account_id}/message_templates`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();
      console.log('Create template response:', data);

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create template');
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          data
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'delete') {
      // Excluir template
      const { templateId } = body;

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${templateId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${config.access_token}`,
          }
        }
      );

      const data = await response.json();
      console.log('Delete template response:', data);

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to delete template');
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          data
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'send') {
      // Enviar template
      const { to, templateName, language = 'pt_BR', components = [] } = body;

      const cleanPhone = to.replace(/\D/g, '');
      const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

      const payload = {
        messaging_product: 'whatsapp',
        to: fullPhone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: language
          },
          components
        }
      };

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${config.phone_number_id}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();
      console.log('Send template response:', data);

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to send template');
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          data
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in templates function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
