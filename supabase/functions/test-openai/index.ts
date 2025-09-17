import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting OpenAI API test...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user session
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User authenticated:', user.id);

    // Get user's workspace
    const { data: workspaceMember } = await supabaseClient
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single();

    if (!workspaceMember) {
      return new Response(JSON.stringify({ error: 'Workspace not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const workspaceId = workspaceMember.workspace_id;
    console.log('Workspace ID:', workspaceId);

    // Get OpenAI API key from workspace settings
    const { data: settings } = await supabaseClient
      .from('workspace_settings')
      .select('openai_api_key')
      .eq('workspace_id', workspaceId)
      .single();

    if (!settings?.openai_api_key) {
      console.error('OpenAI API key not found');
      return new Response(JSON.stringify({
        error: 'OpenAI API key not configured'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate API key format
    if (!settings.openai_api_key.startsWith('sk-')) {
      console.error('Invalid API key format');
      return new Response(JSON.stringify({
        error: 'Invalid API key format'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('API key found, length:', settings.openai_api_key.length);
    console.log('API key prefix:', settings.openai_api_key.substring(0, 10) + '...');

    // Test OpenAI API with a simple request
    console.log('Testing OpenAI API connection...');

    try {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.openai_api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: 'Teste de conexão. Responda apenas "Conectado com sucesso!"'
            }
          ],
          max_tokens: 50,
          temperature: 0.1,
        }),
      });

      console.log('OpenAI response status:', openaiResponse.status);
      console.log('OpenAI response ok:', openaiResponse.ok);

      if (!openaiResponse.ok) {
        const error = await openaiResponse.text();
        console.error('OpenAI API error details:', error);
        return new Response(JSON.stringify({
          error: 'OpenAI API error',
          status: openaiResponse.status,
          details: error
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const openaiData = await openaiResponse.json();
      console.log('OpenAI response received successfully');

      if (!openaiData.choices || !openaiData.choices[0] || !openaiData.choices[0].message) {
        console.error('Invalid OpenAI response structure:', openaiData);
        return new Response(JSON.stringify({
          error: 'Invalid response structure from OpenAI'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const response = openaiData.choices[0].message.content;
      console.log('OpenAI response content:', response);

      return new Response(JSON.stringify({
        success: true,
        message: 'OpenAI API test successful',
        response: response,
        model: openaiData.model,
        usage: openaiData.usage
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (openaiError) {
      console.error('OpenAI fetch error:', openaiError);
      return new Response(JSON.stringify({
        error: 'Failed to connect to OpenAI',
        details: openaiError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Critical error in test-openai function:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});