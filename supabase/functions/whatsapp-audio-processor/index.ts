import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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
    const { messageId, forceReprocess = false } = await req.json();
    console.log('🎵 AudioProcessor - Processing request:', { messageId, forceReprocess });

    if (!messageId) {
      return new Response(
        JSON.stringify({ error: 'messageId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the message details - search by message_id (WhatsApp ID), not by internal id
    const { data: message, error: messageError } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('message_id', messageId)
      .single();

    if (messageError || !message) {
      console.error('❌ Message not found:', messageError);
      return new Response(
        JSON.stringify({ error: 'Message not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📋 Message found:', {
      id: message.id,
      type: message.message_type,
      isFromLead: message.is_from_lead,
      hasMediaUrl: !!message.media_url,
      hasPermanentUrl: !!message.permanent_audio_url,
      hasDecryptionData: !!message.whatsapp_media_id,
      mediaUrl: message.media_url?.substring(0, 50) + '...'
    });

    // Check if message is audio and from lead
    if (message.message_type !== 'audio' || !message.is_from_lead) {
      console.log('❌ Not a received audio message');
      return new Response(
        JSON.stringify({ error: 'Not a received audio message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If already has permanent URL and not forcing reprocess
    if (message.permanent_audio_url && !forceReprocess) {
      console.log('✅ Already has permanent URL:', message.permanent_audio_url);
      return new Response(
        JSON.stringify({ 
          success: true, 
          permanentUrl: message.permanent_audio_url,
          cached: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if media_url exists (se não existir, provavelmente virá via base64 do webhook)
    if (!message.media_url) {
      console.log('❌ No media URL to process');
      return new Response(
        JSON.stringify({ error: 'No media URL to process' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get conversation to find workspace
    const { data: conversation } = await supabase
      .from('whatsapp_conversations')
      .select('workspace_id')
      .eq('id', message.conversation_id)
      .single();

    if (!conversation) {
      console.error('❌ Conversation not found');
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔄 Processing audio from URL:', message.media_url);

    // Check if we have decryption data saved
    let decryptionData = null;
    if (message.whatsapp_media_id) {
      try {
        decryptionData = JSON.parse(message.whatsapp_media_id);
        console.log('🔑 Found decryption data:', {
          hasMediaKey: !!decryptionData.mediaKey,
          hasFileSha256: !!decryptionData.fileSha256,
          hasMediaSha256: !!decryptionData.mediaSha256,
          mimetype: decryptionData.mimetype
        });
      } catch (e) {
        console.log('⚠️ Could not parse decryption data:', e);
      }
    }

    // For encrypted WhatsApp URLs (.enc), we need to decrypt first
    let audioBuffer;
    if (message.media_url.includes('.enc') && decryptionData) {
      console.log('🔐 Attempting to decrypt encrypted audio file...');
      
      // For now, we'll implement a simpler approach - fetch the raw data
      // In a full implementation, you'd use whatsapp-media-decrypt library
      try {
        const response = await fetch(message.media_url);
        if (!response.ok) {
          throw new Error(`Failed to fetch encrypted audio: ${response.status}`);
        }
        
        const encryptedBuffer = await response.arrayBuffer();
        console.log('📥 Downloaded encrypted audio, size:', encryptedBuffer.byteLength);
        
        // TODO: Implement proper decryption with mediaKey/fileSha256/mediaSha256.
        // Não suba buffer criptografado — aborta com erro controlado.
        return new Response(
          JSON.stringify({
            error: 'Encrypted audio cannot be processed without decryption',
            needsDecryption: true
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('❌ Failed to process encrypted audio:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to decrypt audio file', 
            details: error.message 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.log('📥 Fetching audio directly (not encrypted)...');
      // For Evolution API audio URLs, fetch directly without auth headers
      let audioResponse;
      if (message.media_url.includes('mmg.whatsapp.net') || message.media_url.includes('scontent.') || message.media_url.includes('lookaside.fbsbx.com')) {
        // WhatsApp media URLs - try direct fetch first
        audioResponse = await fetch(message.media_url);
      } else {
        // Get WhatsApp access token for Meta API URLs
        const { data: config } = await supabase
          .from('whatsapp_official_configs')
          .select('access_token')
          .eq('workspace_id', conversation.workspace_id)
          .eq('is_active', true)
          .single();

        if (!config?.access_token) {
          console.log('⚠️ No WhatsApp config found, trying direct fetch');
          audioResponse = await fetch(message.media_url);
        } else {
          audioResponse = await fetch(message.media_url, {
            headers: {
              'Authorization': `Bearer ${config.access_token}`,
            },
          });
        }
      }

      if (!audioResponse.ok) {
        console.error('❌ Failed to fetch audio:', audioResponse.status);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to fetch audio from WhatsApp', 
            status: audioResponse.status 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get audio as array buffer
      audioBuffer = await audioResponse.arrayBuffer();
    }
    console.log('📥 Audio downloaded, size:', audioBuffer.byteLength);

    if (audioBuffer.byteLength === 0) {
      console.error('❌ Empty audio buffer received');
      return new Response(
        JSON.stringify({ error: 'Empty audio file received' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For encrypted files, add warning about decryption
    if (message.media_url.includes('.enc')) {
      console.log('⚠️ WARNING: Audio file was encrypted but not properly decrypted!');
      console.log('⚠️ This audio may not play correctly. Need to implement proper decryption.');
    }
    // Generate filename
    const timestamp = Date.now();
    const fileName = `${conversation.workspace_id}/audio/${timestamp}_${message.id}.ogg`;

    console.log('💾 Uploading to storage:', fileName);

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('whatsapp-audio')
      .upload(fileName, audioBuffer, {
        // preferível para WhatsApp/Opus
        contentType: 'audio/ogg; codecs=opus',
        cacheControl: '31536000', // 1 year cache
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to upload audio to storage', 
          details: uploadError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('whatsapp-audio')
      .getPublicUrl(uploadData.path);

    if (!publicUrlData.publicUrl) {
      console.error('❌ Failed to get public URL');
      return new Response(
        JSON.stringify({ error: 'Failed to get public URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const permanentUrl = publicUrlData.publicUrl;
    console.log('✅ Permanent URL created:', permanentUrl);

    // Update message with permanent URL (e media_url para áudio)
    const updates: Record<string, unknown> = {
      permanent_audio_url: permanentUrl,
      updated_at: new Date().toISOString()
    };
    if (message.message_type === 'audio') {
      updates.media_url = permanentUrl; // agora o front já pode tocar
    }

    const { error: updateError } = await supabase
      .from('whatsapp_messages')
      .update(updates)
      .eq('message_id', messageId);

    if (updateError) {
      console.error('❌ Failed to update message:', updateError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update message with permanent URL', 
          details: updateError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Audio processing complete:', permanentUrl);

    return new Response(
      JSON.stringify({ 
        success: true, 
        permanentUrl,
        processed: true,
        fileName,
        size: audioBuffer.byteLength
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Audio processor error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: (error as Error).message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});