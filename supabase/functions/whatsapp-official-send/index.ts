import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, message, conversationId, messageId, attachment } = await req.json();
    
    console.log('📨 Received request:', { 
      to, 
      message: message?.substring(0, 50) + '...', 
      conversationId, 
      messageId, 
      hasAttachment: !!attachment,
      attachment: attachment ? { type: attachment.type, mediaId: attachment.mediaId, filename: attachment.filename } : null
    });

    // Get authorization header
    const authToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authToken) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(authToken);
    if (userError || !user) {
      console.error('❌ User authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's workspace
    const { data: workspaceMember } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single();

    if (!workspaceMember) {
      return new Response(
        JSON.stringify({ error: 'No workspace found for user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🏢 Workspace found:', workspaceMember.workspace_id);

    // Get WhatsApp config
    const { data: config } = await supabase
      .from('whatsapp_official_configs')
      .select('access_token, phone_number_id')
      .eq('workspace_id', workspaceMember.workspace_id)
      .eq('is_active', true)
      .single();

    if (!config?.access_token || !config?.phone_number_id) {
      console.log('❌ WhatsApp config missing for workspace:', workspaceMember.workspace_id);
      return new Response(
        JSON.stringify({ error: 'WhatsApp configuration not found or inactive' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ WhatsApp config found, phone_number_id:', config.phone_number_id);

    // Normalize phone number
    const cleanPhone = to.replace(/\D/g, '');
    console.log('📱 Normalizing phone:', to, '-> cleaned:', cleanPhone);
    
    let finalPhone = cleanPhone;
    if (cleanPhone.length === 13 && cleanPhone.startsWith('55')) {
      console.log('📱 Phone already has country code:', cleanPhone);
      finalPhone = cleanPhone;
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith('55')) {
      console.log('📱 Phone already has country code:', cleanPhone);  
      finalPhone = cleanPhone;
    } else if (cleanPhone.length === 11) {
      finalPhone = '55' + cleanPhone;
      console.log('📱 Added Brazil country code:', finalPhone);
    } else if (cleanPhone.length === 10) {
      finalPhone = '55' + cleanPhone;
      console.log('📱 Added Brazil country code to 10-digit number:', finalPhone);
    }

    console.log('📨 Sending to phone:', finalPhone);

    let whatsappPayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: finalPhone
    };

    // Handle attachment first (including audio)
    if (attachment) {
      console.log('📎 Sending attachment:', attachment.type, 'mediaId:', attachment.mediaId);
      whatsappPayload.type = attachment.type;
      
      if (attachment.type === 'image') {
        whatsappPayload.image = {
          id: attachment.mediaId,
          caption: attachment.caption
        };
      } else if (attachment.type === 'video') {
        whatsappPayload.video = {
          id: attachment.mediaId,
          caption: attachment.caption
        };
      } else if (attachment.type === 'audio') {
        console.log('🎤 Sending audio with mediaId:', attachment.mediaId);
        whatsappPayload.audio = {
          id: attachment.mediaId
        };
      } else if (attachment.type === 'document') {
        whatsappPayload.document = {
          id: attachment.mediaId,
          filename: attachment.filename,
          caption: attachment.caption
        };
      }
    }
    // Handle text message
    else if (message && message.trim()) {
      console.log('📝 Sending text message:', message.substring(0, 50) + '...');
      whatsappPayload.type = "text";
      whatsappPayload.text = {
        body: message
      };
    } else {
      return new Response(
        JSON.stringify({ error: 'No message content provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📤 WhatsApp API payload:', JSON.stringify(whatsappPayload, null, 2));

    // Send message to WhatsApp API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${config.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(whatsappPayload),
      }
    );

    const responseData = await response.json();
    console.log('📤 WhatsApp API response:', JSON.stringify(responseData, null, 2));

    // Verificar erros mesmo em respostas 200
    if (!response.ok || responseData.error) {
      console.error('❌ WhatsApp API error:', responseData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send message', 
          details: responseData.error?.message || 'Unknown error',
          whatsappResponse: responseData
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const whatsappMessageId = responseData.messages?.[0]?.id;
    console.log('✅ Message sent successfully:', JSON.stringify(responseData, null, 2));

    // Save message to database
    if (conversationId && whatsappMessageId) {
      console.log('💾 Saving message to database');
      
      let messageText = message || '';
      let messageType = 'text';
      let mediaUrl = null;
      let mediaType = null;
      let attachmentName = null;
      
      if (attachment) {
        messageType = attachment.type;
        
        // Para anexos, buscar a URL pública e salvar permanentemente se for imagem
        console.log('🔍 Fetching public media URL for attachment:', attachment.mediaId);
        try {
          const mediaResponse = await fetch(
            `https://graph.facebook.com/v18.0/${attachment.mediaId}`,
            {
              headers: {
                'Authorization': `Bearer ${config.access_token}`,
              },
            }
          );
          
          if (mediaResponse.ok) {
            const mediaData = await mediaResponse.json();
            const originalUrl = mediaData.url;
            console.log('✅ Got original media URL:', originalUrl);
            
            // Se for imagem, salvar permanentemente no storage público
            if (attachment.type === 'image') {
              try {
                console.log('💾 Saving image permanently to storage...');
                
                // Baixar a imagem
                const imageResponse = await fetch(originalUrl, {
                  headers: { 'Authorization': `Bearer ${config.access_token}` }
                });
                
                if (imageResponse.ok) {
                  const imageBuffer = await imageResponse.arrayBuffer();
                  const fileName = `${Date.now()}_${attachment.mediaId}.jpg`;
                  const filePath = `${workspaceMember.workspace_id}/images/${fileName}`;
                  
                  // Upload para storage público
                  const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('whatsapp-audio') // Usar bucket público existente
                    .upload(filePath, imageBuffer, {
                      contentType: 'image/jpeg',
                      cacheControl: '31536000', // 1 ano de cache
                      upsert: false
                    });

                  if (!uploadError && uploadData) {
                    // Obter URL pública
                    const { data: publicUrlData } = supabase.storage
                      .from('whatsapp-audio')
                      .getPublicUrl(uploadData.path);
                    
                    if (publicUrlData.publicUrl) {
                      mediaUrl = publicUrlData.publicUrl;
                      console.log('✅ Image saved permanently with public URL:', mediaUrl);
                    } else {
                      console.log('⚠️ Failed to get public URL, using original');
                      mediaUrl = originalUrl;
                    }
                  } else {
                    console.error('❌ Failed to save image permanently:', uploadError);
                    mediaUrl = originalUrl;
                  }
                } else {
                  console.error('❌ Failed to download image for permanent storage');
                  mediaUrl = originalUrl;
                }
              } catch (storageError) {
                console.error('❌ Error in permanent image storage:', storageError);
                mediaUrl = originalUrl;
              }
      } else if (attachment.type === 'audio') {
        // Para áudio, usar permanent URL se disponível
        if (attachment.permanentUrl) {
          mediaUrl = attachment.permanentUrl;
          console.log('🎵 Audio sent with permanent URL:', attachment.permanentUrl);
        } else {
          mediaUrl = null;
          console.log('🎵 Audio sent with media_id only:', attachment.mediaId);
        }
      } else {
              // Para outros tipos de mídia, usar URL original
              mediaUrl = originalUrl;
            }
          } else {
            console.error('❌ Failed to get media URL for attachment, using fallback');
            mediaUrl = `https://graph.facebook.com/v18.0/${attachment.mediaId}`;
          }
        } catch (error) {
          console.error('❌ Error fetching media URL for attachment:', error);
          mediaUrl = `https://graph.facebook.com/v18.0/${attachment.mediaId}`;
        }
        messageType = attachment.type;
        
        if (attachment.type === 'image') {
          messageText = attachment.caption || '📷 Imagem';
          mediaType = 'image/jpeg';
          attachmentName = attachment.filename;
        } else if (attachment.type === 'video') {
          messageText = attachment.caption || '🎥 Vídeo';
          mediaType = 'video/mp4';
          attachmentName = attachment.filename;
        } else if (attachment.type === 'audio') {
          messageText = '🎤 Mensagem de áudio';
          messageType = 'audio';
          mediaType = null; // Não definir mediaType para áudios enviados
          attachmentName = attachment.filename;
        } else if (attachment.type === 'document') {
          messageText = attachment.filename || '📄 Documento';
          mediaType = 'application/pdf';
          attachmentName = attachment.filename;
        }
      }

      const messageRecord = {
        conversation_id: conversationId,
        message_text: messageText,
        message_type: messageType,
        message_id: whatsappMessageId,
        is_from_lead: false,
        sent_by: user.id,
        status: 'sent',
        timestamp: new Date().toISOString(),
        media_url: mediaUrl,
        media_type: mediaType,
        attachment_name: attachmentName,
        whatsapp_media_id: attachment?.type === 'audio' ? attachment.mediaId : null,
        permanent_audio_url: attachment?.permanentUrl || null
      };

      console.log('💾 Saving message with media data:', JSON.stringify(messageRecord, null, 2));

      const { error: insertError } = await supabase
        .from('whatsapp_messages')
        .insert(messageRecord);

      if (insertError) {
        console.error('❌ Error saving message:', insertError);
      } else {
        console.log('✅ Message saved to database');
      }

      // Update conversation
      await supabase
        .from('whatsapp_conversations')
        .update({ 
          last_message_at: new Date().toISOString(),
          is_read: true
        })
        .eq('id', conversationId);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        whatsappMessageId,
        data: responseData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error sending message:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send message', 
        details: (error as Error).message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});