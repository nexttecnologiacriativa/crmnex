import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const { campaignId } = await req.json();
    console.log('Processing Evolution API campaign:', campaignId);

    // Buscar dados da campanha usando fetch direto
    const campaignResponse = await fetch(`${supabaseUrl}/rest/v1/marketing_campaigns?id=eq.${campaignId}&select=*`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json'
      }
    });

    const campaigns = await campaignResponse.json();
    const campaign = campaigns[0];

    if (!campaign) {
      console.error('Campaign not found');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Campaign not found' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar instância Evolution API pela campanha
    const evolutionInstanceName = campaign.segments?.evolution_instance || campaign.evolution_instance;
    const instanceResponse = await fetch(`${supabaseUrl}/rest/v1/whatsapp_instances?workspace_id=eq.${campaign.workspace_id}&instance_name=eq.${evolutionInstanceName}&status=eq.open`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json'
      }
    });

    const instances = await instanceResponse.json();
    const instance = instances[0];

    if (!instance) {
      console.error('Evolution API instance not found or not connected');
      // Atualizar status da campanha para failed
      await fetch(`${supabaseUrl}/rest/v1/marketing_campaigns?id=eq.${campaignId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'failed' })
      });
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Evolution API instance not found or not connected' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar configuração global da Evolution API
    const evolutionConfig = {
      api_url: instance.webhook_url ? instance.webhook_url.replace('/whatsapp-webhook', '') : null,
      instance_name: instance.instance_name,
      api_key: instance.instance_key
    };

    if (!evolutionConfig.api_url) {
      console.error('Evolution API URL not configured');
      
      // Atualizar status da campanha para failed
      await fetch(`${supabaseUrl}/rest/v1/marketing_campaigns?id=eq.${campaignId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'failed' })
      });
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Evolution API not properly configured' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar destinatários pendentes
    const recipientsResponse = await fetch(`${supabaseUrl}/rest/v1/marketing_campaign_recipients?campaign_id=eq.${campaignId}&status=eq.pending&order=created_at`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json'
      }
    });

    const recipients = await recipientsResponse.json();

    if (!recipients || recipients.length === 0) {
      console.log('No pending recipients found');
      
      // Atualizar status da campanha para sent
      await fetch(`${supabaseUrl}/rest/v1/marketing_campaigns?id=eq.${campaignId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'sent' })
      });
        
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No recipients to process' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${recipients.length} recipients to process`);

    // Atualizar status da campanha para 'sending'
    await fetch(`${supabaseUrl}/rest/v1/marketing_campaigns?id=eq.${campaignId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'sending' })
    });

    let sentCount = 0;
    let failedCount = 0;
    const intervalMinutes = campaign.message_interval_minutes || 2;

    // Processar cada destinatário com intervalo
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      
      try {
        // Selecionar template/mensagem
        let messageText = campaign.message_preview || 'Mensagem de campanha';
        
        try {
          const templates = campaign.multiple_templates ? JSON.parse(campaign.multiple_templates) : [];
          if (templates.length > 0) {
            const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
            messageText = randomTemplate.preview || messageText;
          }
        } catch (e) {
          console.log('Error parsing templates, using default message');
        }

        // Normalizar número de telefone
        const normalizedPhone = recipient.phone_number.replace(/\D/g, '');

        // Enviar mensagem via Evolution API
        const evolutionApiUrl = evolutionConfig.api_url.includes('supabase.co') 
          ? 'https://api.evolutionapi.com' // URL padrão se não configurada
          : evolutionConfig.api_url;
          
        const evolutionResponse = await fetch(`${evolutionApiUrl}/message/sendText/${evolutionConfig.instance_name}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionConfig.api_key
          },
          body: JSON.stringify({
            number: normalizedPhone,
            text: messageText
          })
        });

        const evolutionData = await evolutionResponse.json();
        console.log('Evolution API response:', evolutionData);

        if (evolutionResponse.ok && evolutionData.key) {
          // Sucesso - atualizar recipient
          await fetch(`${supabaseUrl}/rest/v1/marketing_campaign_recipients?id=eq.${recipient.id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              status: 'sent',
              sent_at: new Date().toISOString()
            })
          });

          sentCount++;
          console.log(`Message sent successfully to ${recipient.phone_number}`);
        } else {
          // Falha - atualizar recipient
          await fetch(`${supabaseUrl}/rest/v1/marketing_campaign_recipients?id=eq.${recipient.id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              status: 'failed',
              failed_at: new Date().toISOString(),
              error_message: evolutionData.message || 'Unknown error'
            })
          });

          failedCount++;
          console.log(`Failed to send message to ${recipient.phone_number}:`, evolutionData.message);
        }

      } catch (error) {
        console.error(`Error sending to ${recipient.phone_number}:`, error);
        
        await fetch(`${supabaseUrl}/rest/v1/marketing_campaign_recipients?id=eq.${recipient.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'failed',
            failed_at: new Date().toISOString(),
            error_message: error.message
          })
        });

        failedCount++;
      }

      // Aguardar intervalo antes da próxima mensagem (exceto na última)
      if (i < recipients.length - 1) {
        console.log(`Waiting ${intervalMinutes} minutes before next message...`);
        await new Promise(resolve => setTimeout(resolve, intervalMinutes * 60 * 1000));
      }
    }

    // Atualizar status final da campanha
    const finalStatus = sentCount > 0 ? 'sent' : 'failed';
    await fetch(`${supabaseUrl}/rest/v1/marketing_campaigns?id=eq.${campaignId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        status: finalStatus,
        sent_at: sentCount > 0 ? new Date().toISOString() : null
      })
    });

    console.log(`Campaign completed: ${sentCount} sent, ${failedCount} failed`);

    return new Response(JSON.stringify({
      success: true,
      campaign_id: campaignId,
      sent_count: sentCount,
      failed_count: failedCount,
      total_recipients: recipients.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in marketing-campaign-evolution-send:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});