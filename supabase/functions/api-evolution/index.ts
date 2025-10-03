import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Validate secret token from querystring
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const expectedToken = Deno.env.get('EVOLUTION_WEBHOOK_TOKEN');
    
    if (!token || !expectedToken || token !== expectedToken) {
      console.log('Invalid token provided');
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    const body = await req.json();
    console.log('Evolution webhook received:', JSON.stringify(body, null, 2));

    // Extract message data from body.data
    const messageData = body.data;
    if (!messageData) {
      console.log('No message data found');
      return new Response(
        JSON.stringify({ error: 'No message data found' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Extract required fields
    const threadId = messageData.remoteJid;
    const fromMe = messageData.fromMe || false;
    const pushName = messageData.pushName || '';
    const messageType = messageData.messageType;
    const timestamp = messageData.messageTimestamp || Date.now();

    // Extract text content and media info from different message types
    let text = '';
    let mediaUrl = null;
    let mediaType = null;
    let caption = null;
    
    if (messageData.message) {
      // Text messages
      if (messageData.message.conversation) {
        text = messageData.message.conversation;
      } else if (messageData.message.extendedTextMessage?.text) {
        text = messageData.message.extendedTextMessage.text;
      }
      
      // Image messages
      else if (messageData.message.imageMessage) {
        const imgMsg = messageData.message.imageMessage;
        mediaUrl = imgMsg.url || imgMsg.fileUrl;
        mediaType = 'image';
        caption = imgMsg.caption || '';
        text = caption || 'Imagem';
      }
      
      // Audio messages
      else if (messageData.message.audioMessage) {
        const audMsg = messageData.message.audioMessage;
        mediaUrl = audMsg.url || audMsg.fileUrl;
        mediaType = 'audio';
        text = 'Áudio';
      }
      
      // Video messages
      else if (messageData.message.videoMessage) {
        const vidMsg = messageData.message.videoMessage;
        mediaUrl = vidMsg.url || vidMsg.fileUrl;
        mediaType = 'video';
        caption = vidMsg.caption || '';
        text = caption || 'Vídeo';
      }
      
      // Document messages
      else if (messageData.message.documentMessage) {
        const docMsg = messageData.message.documentMessage;
        mediaUrl = docMsg.url || docMsg.fileUrl;
        mediaType = 'document';
        caption = docMsg.caption || docMsg.fileName || '';
        text = caption || 'Documento';
      }
    }

    // Extract custom fields from the request body
    let customFields = {};
    if (body.customFields && typeof body.customFields === 'object') {
      customFields = body.customFields;
      console.log('Custom fields received:', customFields);
    }

    // Also check for custom fields in the message data itself
    if (messageData.customFields && typeof messageData.customFields === 'object') {
      customFields = { ...customFields, ...messageData.customFields };
      console.log('Custom fields from message data:', messageData.customFields);
    }

    // Validate required fields
    if (!threadId || !messageType) {
      console.log('Missing required fields: threadId or messageType');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: threadId or messageType' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Only process if we have text content or it's a valid message type
    if (!text && messageType === 'conversation') {
      console.log('No text content found for conversation message');
      return new Response(
        JSON.stringify({ ok: true, message: 'No text content to process' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Download and store media if present
    let permanentMediaUrl = mediaUrl;
    let attachmentName = null;
    
    if (mediaUrl && mediaType) {
      try {
        console.log('📥 Downloading media from Evolution API:', mediaUrl);
        
        // Download media from Evolution API
        const mediaResponse = await fetch(mediaUrl);
        if (mediaResponse.ok) {
          const mediaBuffer = await mediaResponse.arrayBuffer();
          const base64Media = btoa(String.fromCharCode(...new Uint8Array(mediaBuffer)));
          
          // Determine mimeType and filename from mediaType
          let mimeType = 'application/octet-stream';
          let extension = 'bin';
          
          if (mediaType === 'image') {
            mimeType = 'image/jpeg';
            extension = 'jpg';
          } else if (mediaType === 'audio') {
            mimeType = 'audio/ogg';
            extension = 'ogg';
          } else if (mediaType === 'video') {
            mimeType = 'video/mp4';
            extension = 'mp4';
          } else if (mediaType === 'document') {
            mimeType = 'application/pdf';
            extension = 'pdf';
          }
          
          const filename = `${mediaType}_${Date.now()}.${extension}`;
          attachmentName = filename;
          
          // Upload to Supabase Storage via edge function
          const uploadResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-media-upload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
              fileData: `data:${mimeType};base64,${base64Media}`,
              mimeType,
              filename,
              workspaceId: 'default'
            })
          });
          
          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json();
            permanentMediaUrl = uploadResult.publicUrl;
            console.log('✅ Media stored permanently:', permanentMediaUrl);
          } else {
            console.error('❌ Upload failed:', await uploadResponse.text());
          }
        } else {
          console.error('❌ Failed to download media:', mediaResponse.status);
        }
      } catch (mediaError) {
        console.error('❌ Failed to download/store media:', mediaError);
        // Continue with original URL
      }
    }

    // Save message to Supabase com attachment_name
    const { data: savedMessage, error: saveError } = await supabase
      .from('whatsapp_webhook_messages')
      .insert({
        thread_id: threadId,
        from_me: fromMe,
        push_name: pushName,
        message_type: mediaType || messageType,
        text: text,
        timestamp: typeof timestamp === 'number' ? timestamp : parseInt(timestamp),
        custom_fields: customFields,
        raw: messageData,
        media_url: permanentMediaUrl,
        media_type: mediaType
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving message to database:', saveError);
      return new Response(
        JSON.stringify({ error: 'Failed to save message' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Message saved successfully:', savedMessage.id);

    // TODO: Integrate with Lovable agent createMessage function
    // This would require additional setup with the agent system
    console.log('TODO: Create message in Lovable agent with threadId:', threadId);

    return new Response(
      JSON.stringify({ ok: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in Evolution webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});