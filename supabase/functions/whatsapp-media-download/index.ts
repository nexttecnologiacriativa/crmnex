// WhatsApp Media Download Function for Evolution API
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎵 Media Download - Processing request...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { messageId, workspaceId } = await req.json();

    if (!messageId || !workspaceId) {
      return new Response(
        JSON.stringify({ error: 'messageId and workspaceId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📋 Processing media download for:', { messageId, workspaceId });

    // Get Evolution API configuration
    const { data: evolutionConfig } = await supabase
      .from('whatsapp_evolution_configs')
      .select('api_url, global_api_key')
      .eq('workspace_id', workspaceId)
      .single();

    if (!evolutionConfig) {
      return new Response(
        JSON.stringify({ error: 'Evolution API not configured for workspace' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get instance for this workspace
    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('instance_name')
      .eq('workspace_id', workspaceId)
      .eq('status', 'open')
      .single();

    if (!instance) {
      return new Response(
        JSON.stringify({ error: 'No active WhatsApp instance found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔄 Downloading media from Evolution API...', {
      instance: instance.instance_name,
      messageId
    });

    // Try to download media from Evolution API
    const mediaResponse = await fetch(
      `${evolutionConfig.api_url}/message/downloadMedia/${instance.instance_name}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionConfig.global_api_key
        },
        body: JSON.stringify({
          messageId: messageId,
          convertToMp4: false, // Keep original format for audio
          pathFile: false // Return base64 instead of file path
        })
      }
    );

    if (!mediaResponse.ok) {
      console.error('❌ Evolution API media download failed:', mediaResponse.status);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to download media from Evolution API',
          status: mediaResponse.status 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mediaData = await mediaResponse.json();
    console.log('📦 Media downloaded:', {
      hasBase64: !!mediaData.base64,
      mimeType: mediaData.mimetype,
      fileName: mediaData.filename
    });

    if (!mediaData.base64) {
      return new Response(
        JSON.stringify({ error: 'No base64 data received from Evolution API' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save to Supabase Storage
    const fileName = `${Date.now()}_${messageId}.${mediaData.filename?.split('.').pop() || 'ogg'}`;
    const filePath = `${workspaceId}/audio/${fileName}`;

    // Convert base64 to buffer
    const base64Data = mediaData.base64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const { error: uploadError } = await supabase.storage
      .from('whatsapp-media')
      .upload(filePath, buffer, {
        contentType: mediaData.mimetype || 'audio/ogg',
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to save audio to storage' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('whatsapp-media')
      .getPublicUrl(filePath);

    const permanentUrl = urlData.publicUrl;

    // Update message with permanent URL
    const { error: updateError } = await supabase
      .from('whatsapp_messages')
      .update({ 
        permanent_audio_url: permanentUrl,
        status: 'sent'
      })
      .eq('message_id', messageId);

    if (updateError) {
      console.error('❌ Message update error:', updateError);
    }

    console.log('✅ Media processing complete:', permanentUrl);

    return new Response(
      JSON.stringify({ 
        success: true,
        permanentUrl,
        mimeType: mediaData.mimetype,
        fileName: mediaData.filename
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Media download error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});