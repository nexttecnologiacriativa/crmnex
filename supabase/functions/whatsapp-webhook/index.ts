import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  console.log(`🚀 Webhook receiver started - URL: ${req.url}, Method: ${req.method}`);
  console.log(`🧪 WEBHOOK TEST - This confirms the webhook is being called!`);
  console.log(`🚀 Headers:`, Object.fromEntries(req.headers.entries()));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const webhookData = await req.json();
    console.log('=== WEBHOOK RECEIVED ===');
    console.log('Full webhook data:', JSON.stringify(webhookData, null, 2));
    console.log('Event type:', webhookData.event);
    console.log('Instance:', webhookData.instance || webhookData.instanceName);
    console.log('Data array length:', Array.isArray(webhookData.data) ? webhookData.data.length : 'Not an array');

    const evt = (webhookData.event || '').toString();
    if (evt === 'messages.upsert' || evt === 'MESSAGES_UPSERT') {
      console.log('Processing MESSAGES_UPSERT event');
      await handleMessageWebhook(webhookData, supabase);
    } else if (evt === 'connection.update' || evt === 'CONNECTION_UPDATE') {
      console.log('Processing CONNECTION_UPDATE event');
      await handleConnectionUpdate(webhookData, supabase);
    } else {
      console.log('Unhandled webhook event:', webhookData.event);
    }

    return new Response(JSON.stringify({ success: true, processed: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('=== WEBHOOK ERROR ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({ error: error.message, success: false }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleMessageWebhook(webhookData: any, supabase: any) {
  const instanceName = webhookData.instance || webhookData.instanceName;
  const data = webhookData.data;
  
  console.log('=== PROCESSING MESSAGE WEBHOOK ===');
  console.log('Instance name:', instanceName);
  console.log('Data type:', typeof data);
  console.log('Data is array:', Array.isArray(data));
  console.log('Data content:', data);
  
  // Verificar se data é um array ou um objeto único
  const messages = Array.isArray(data) ? data : [data];
  console.log('Processing', messages.length, 'message(s)');
  
  for (const message of messages) {
    try {
      console.log('=== PROCESSING INDIVIDUAL MESSAGE ===');
      console.log('Message object:', JSON.stringify(message, null, 2));
      
      const messageContent = message.message;
      const messageType = message.messageType || 'text';
      const fromMe = message.key?.fromMe || false;
      const phoneNumber = message.key?.remoteJid?.replace('@s.whatsapp.net', '').replace('@g.us', '');
      const pushName = message.pushName || 'Usuário';
      const messageId = message.key?.id;

      console.log('Message details:', {
        messageType,
        fromMe,
        phoneNumber,
        pushName,
        messageId,
        hasMessageContent: !!messageContent,
        messageContentType: typeof messageContent
      });

      console.log('Processing message - fromMe:', fromMe);

      // Buscar instância pelo nome no banco primeiro para ter workspace_id
      const { data: instance, error: instanceError } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('instance_name', instanceName)
        .maybeSingle();

      if (instanceError) {
        console.error('Error finding instance:', instanceError);
        continue;
      }

      if (!instance) {
        console.log('Instance not found in database:', instanceName);
        continue;
      }

      // Verificar se a mensagem tem conteúdo válido
      if (!messageContent) {
        console.log('Skipping message without content');
        continue;
      }

      const phone = phoneNumber;
      
      // Extrair texto da mensagem e mídia Base64
      let messageText = '';
      let msgType = 'text';
      let mediaUrl = null;
      let mediaBase64 = '';

      if (messageContent?.conversation) {
        messageText = messageContent.conversation;
        console.log('✅ Text message received:', messageText);
      } else if (messageContent?.extendedTextMessage?.text) {
        messageText = messageContent.extendedTextMessage.text;
        console.log('✅ Extended text message received:', messageText);
      } else if (messageContent?.imageMessage) {
        messageText = messageContent.imageMessage.caption || 'Imagem';
        msgType = 'image';
        mediaUrl = messageContent.imageMessage.url;
        mediaBase64 = messageContent.imageMessage.base64 || '';
        
        // Process image with base64 if available
        if (mediaBase64) {
          console.log('🖼️ Processing image with base64 from webhook...');
          try {
            const byteArray = Uint8Array.from(atob(mediaBase64), c => c.charCodeAt(0));
            const mime = messageContent.imageMessage.mimetype || 'image/jpeg';
            const blob = new Blob([byteArray], { type: mime });
            
            const timestamp = Date.now();
            const extension = mime.includes('png') ? 'png' : 'jpg';
            const fileName = `image_${message.messageTimestamp || timestamp}_${messageId}.${extension}`;
            const filePath = `${instance.workspace_id}/images/${fileName}`;
            
            const { error: uploadError } = await supabase.storage
              .from('whatsapp-media')
              .upload(filePath, blob, {
                contentType: mime,
                cacheControl: '3600'
              });

            if (!uploadError) {
              const { data: urlData } = supabase.storage
                .from('whatsapp-media')
                .getPublicUrl(filePath);
              
              mediaUrl = urlData.publicUrl;
              console.log('✅ Image processed and saved, URL:', mediaUrl);
            } else {
              console.error('❌ Storage upload error for image:', uploadError);
            }
          } catch (error) {
            console.error('❌ Image processing error:', error);
          }
        } else {
          // If no base64, try to use the media proxy to get the image and save it
          console.log('🖼️ Processing image without base64, saving via proxy...');
          try {
            // Save directly to storage using the media URL
            const timestamp = Date.now();
            const fileName = `image_${message.messageTimestamp}_${messageId}.jpg`;
            const filePath = `${instance.workspace_id}/images/${fileName}`;
            
            // Try to fetch the image from the original URL and save it
            const imageResponse = await fetch(mediaUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });
            
            if (imageResponse.ok) {
              const imageBuffer = await imageResponse.arrayBuffer();
              const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
              
              const { error: uploadError } = await supabase.storage
                .from('whatsapp-media')
                .upload(filePath, imageBuffer, {
                  contentType: contentType,
                  cacheControl: '3600'
                });

              if (!uploadError) {
                const { data: urlData } = supabase.storage
                  .from('whatsapp-media')
                  .getPublicUrl(filePath);
                
                mediaUrl = urlData.publicUrl;
                console.log('✅ Image downloaded and saved, URL:', mediaUrl);
              } else {
                console.error('❌ Storage upload error for downloaded image:', uploadError);
              }
            } else {
              console.log('⚠️ Could not fetch image directly, keeping original URL');
            }
          } catch (error) {
            console.error('❌ Image download and save error:', error);
          }
        }
      } else if (messageContent?.audioMessage || messageContent?.pttMessage) {
        // Handle both regular audio and PTT (Push To Talk)
        const audioMsg = messageContent.audioMessage || messageContent.pttMessage;
        messageText = !fromMe ? '[audio recebido]' : '[audio enviado]';
        msgType = 'audio';
        mediaUrl = audioMsg.url;
        mediaBase64 = audioMsg.base64 || '';
        
        console.log('🎵 Audio/PTT message received:', { 
          type: messageContent.audioMessage ? 'audio' : 'ptt',
          hasBase64: !!mediaBase64,
          hasUrl: !!mediaUrl,
          mimetype: audioMsg.mimetype
        });
      } else if (messageContent?.videoMessage) {
        messageText = messageContent.videoMessage.caption || 'Vídeo';
        msgType = 'video';
        mediaUrl = messageContent.videoMessage.url;
        mediaBase64 = messageContent.videoMessage.base64 || '';
      } else if (messageContent?.documentMessage) {
        messageText = messageContent.documentMessage.fileName || 'Documento';
        msgType = 'document';
        mediaUrl = messageContent.documentMessage.url;
        mediaBase64 = messageContent.documentMessage.base64 || '';
      } else {
        messageText = '[Mídia não suportada]';
        msgType = 'unknown';
      }

      console.log('💾 Saving message to database:', {
        messageText,
        msgType,
        isFromLead: !fromMe,
        messageId
      });

      console.log('Found instance:', instance);

      // Process audio and upload to Supabase Storage
      let permanentAudioUrl = '';
      let audioMimeType = '';
      
      if (msgType === 'audio') {
        console.log('🎵 Processing audio message...');
        
        const audioMsg = messageContent.audioMessage || messageContent.pttMessage;
        audioMimeType = audioMsg?.mimetype || 'audio/ogg; codecs=opus';
        
        // Try to download and upload audio to our storage
        if (mediaBase64) {
          console.log('🎵 Processing audio with base64 from webhook...');
          try {
            const byteArray = Uint8Array.from(atob(mediaBase64), c => c.charCodeAt(0));
            const isOgg = audioMimeType.includes('ogg');
            const isPtt = !!messageContent.pttMessage;
            const fileExt = isOgg ? 'ogg' : (isPtt ? 'ogg' : 'opus');
            
            const timestamp = message.messageTimestamp || Date.now();
            const fileName = `${isPtt ? 'ptt' : 'audio'}_${timestamp}_${messageId}.${fileExt}`;
            const filePath = `${instance.workspace_id}/audio/${fileName}`;
            
            console.log('📁 Uploading audio to storage:', { filePath, mimeType: audioMimeType, size: byteArray.length });
            
            const { error: uploadError } = await supabase.storage
              .from('whatsapp-media')
              .upload(filePath, byteArray, {
                contentType: audioMimeType,
                cacheControl: '3600'
              });

            if (!uploadError) {
              const { data: urlData } = supabase.storage
                .from('whatsapp-media')
                .getPublicUrl(filePath);
              
              permanentAudioUrl = urlData.publicUrl;
              console.log('✅ Audio uploaded to Supabase Storage:', permanentAudioUrl);
            } else {
              console.error('❌ Audio upload error:', uploadError);
            }
          } catch (error) {
            console.error('❌ Audio processing error:', error);
          }
        } else if (mediaUrl) {
          console.log('🎵 Processing audio from URL (attempting download)...');
          try {
            // Try to download the audio file from WhatsApp
            const response = await fetch(mediaUrl);
            if (response.ok) {
              const audioBuffer = await response.arrayBuffer();
              const byteArray = new Uint8Array(audioBuffer);
              
              const isOgg = audioMimeType.includes('ogg');
              const isPtt = !!messageContent.pttMessage;
              const fileExt = isOgg ? 'ogg' : (isPtt ? 'ogg' : 'opus');
              
              const timestamp = message.messageTimestamp || Date.now();
              const fileName = `${isPtt ? 'ptt' : 'audio'}_${timestamp}_${messageId}.${fileExt}`;
              const filePath = `${instance.workspace_id}/audio/${fileName}`;
              
              console.log('📁 Uploading downloaded audio to storage:', { filePath, mimeType: audioMimeType, size: byteArray.length });
              
              const { error: uploadError } = await supabase.storage
                .from('whatsapp-media')
                .upload(filePath, byteArray, {
                  contentType: audioMimeType,
                  cacheControl: '3600'
                });

              if (!uploadError) {
                const { data: urlData } = supabase.storage
                  .from('whatsapp-media')
                  .getPublicUrl(filePath);
                
                permanentAudioUrl = urlData.publicUrl;
                console.log('✅ Downloaded audio uploaded to Supabase Storage:', permanentAudioUrl);
              } else {
                console.error('❌ Downloaded audio upload error:', uploadError);
              }
            } else {
              console.warn('⚠️ Could not download audio from URL:', response.status);
            }
          } catch (error) {
            console.error('❌ Audio download error:', error);
          }
        }
      }

      // Buscar conversa existente ou criar nova
      let { data: conversation, error: convError } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('phone_number', phone)
        .eq('workspace_id', instance.workspace_id)
        .maybeSingle();

      if (convError) {
        console.error('Error finding conversation:', convError);
        continue;
      }

      if (!conversation) {
        console.log('Creating new conversation for phone:', phone);
        
        // Função para normalizar telefone (remover DDI se presente)
        const normalizePhone = (phoneNumber: string): string => {
          const digits = phoneNumber.replace(/\D/g, '');
          // Se começa com 55 e tem 13 ou 12 dígitos, remover o 55
          if (digits.startsWith('55') && (digits.length === 13 || digits.length === 12)) {
            return digits.substring(2);
          }
          return digits;
        };

        // Buscar se existe lead com este telefone (tanto com quanto sem DDI)
        const normalizedPhone = normalizePhone(phone);
        const phoneWithDDI = phone.startsWith('55') ? phone : `55${phone}`;
        
        const { data: leads } = await supabase
          .from('leads')
          .select('id, name, phone')
          .eq('workspace_id', instance.workspace_id)
          .or(`phone.eq.${phone},phone.eq.${normalizedPhone},phone.eq.${phoneWithDDI}`);
        
        const lead = leads?.[0];

        // Criar nova conversa
        const { data: newConversation, error: createError } = await supabase
          .from('whatsapp_conversations')
          .insert({
            phone_number: phone,
            contact_name: lead?.name || pushName || phone,
            instance_id: instance.id,
            workspace_id: instance.workspace_id,
            lead_id: lead?.id || null,
            last_message_at: new Date().toISOString(),
            is_read: false,
            message_count: 1
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating conversation:', createError);
          continue;
        }

        conversation = newConversation;
        console.log('Created new conversation:', conversation);
      } else {
        console.log('Found existing conversation:', conversation);
        
        // Atualizar contagem de mensagens e timestamp
        const { error: updateError } = await supabase
          .from('whatsapp_conversations')
          .update({
            last_message_at: new Date().toISOString(),
            message_count: (conversation.message_count || 0) + 1,
            is_read: false
          })
          .eq('id', conversation.id);

        if (updateError) {
          console.error('Error updating conversation:', updateError);
        }
      }

      // Verificar se a mensagem já existe (evitar duplicatas)
      const { data: existingMessage } = await supabase
        .from('whatsapp_messages')
        .select('id')
        .eq('message_id', messageId)
        .maybeSingle();

      if (existingMessage) {
        console.log('Message already exists, skipping:', messageId);
        continue;
      }

      // Salvar mensagem no banco com campos de descriptografia para áudio
      const messageData: any = {
        conversation_id: conversation.id,
        message_id: messageId,
        message_text: messageText,
        message_type: msgType,
        is_from_lead: !fromMe, // Se fromMe = true, mensagem nossa; se false, mensagem do lead
        // Áudio: NUNCA usar .enc em media_url
        media_url: msgType === 'audio'
          ? (permanentAudioUrl || null)
          : (mediaUrl || permanentAudioUrl || null),
        permanent_audio_url: permanentAudioUrl || null,
        // Rastrear a URL original criptografada
        encrypted_media_url: msgType === 'audio' ? (mediaUrl || null) : null,
        timestamp: new Date(message.messageTimestamp * 1000).toISOString(),
        status: 'received'
      };

      // Para áudio, salvar dados de descriptografia se disponíveis
      if (msgType === 'audio' && messageContent?.audioMessage) {
        const audioData = messageContent.audioMessage;
        messageData.whatsapp_media_id = JSON.stringify({
          mediaKey: audioData.mediaKey,
          fileSha256: audioData.fileSha256,
          mediaSha256: audioData.mediaSha256,
          directPath: audioData.directPath,
          mimetype: audioData.mimetype || 'audio/ogg; codecs=opus'
        });
        
        console.log('🎵 Salvando dados de descriptografia para áudio:', {
          hasMediaKey: !!audioData.mediaKey,
          hasFileSha256: !!audioData.fileSha256,
          hasMediaSha256: !!audioData.mediaSha256,
          mimetype: audioData.mimetype
        });
      }

      const { data: savedMessage, error: msgError } = await supabase
        .from('whatsapp_messages')
        .insert(messageData)
        .select()
        .single();

      if (msgError) {
        console.error('Error saving message:', msgError);
      } else {
        console.log('Message saved successfully:', messageId);
        console.log('✅ Message type:', msgType);
        console.log('✅ Is from lead:', !fromMe);
        console.log('✅ Message text:', messageText);
        
        // Para áudio, sempre tentar processar (Base64 ou URL criptografada)
        if (msgType === 'audio' && savedMessage) {
          console.log('🎵 Triggering audio processor for message:', messageId);
          try {
            const { error: processError } = await supabase.functions.invoke('whatsapp-audio-processor', {
              body: { messageId: messageId }
            });
            
            if (processError) {
              console.error('❌ Error processing audio:', processError);
            } else {
              console.log('✅ Audio processing triggered successfully');
            }
          } catch (error) {
            console.error('❌ Error triggering audio processor:', error);
          }
        }
      }

    } catch (error) {
      console.error('Error processing message:', error);
    }
  }
}

async function handleConnectionUpdate(webhookData: any, supabase: any) {
  try {
    const instanceName = webhookData.instance || webhookData.instanceName;
    const connectionData = webhookData.data;

    console.log('=== CONNECTION UPDATE ===');
    console.log('Instance:', instanceName);
    console.log('Connection data:', connectionData);

    // Atualizar status da instância
    const { error } = await supabase
      .from('whatsapp_instances')
      .update({
        status: connectionData.state || connectionData.connectionStatus || 'close',
        last_seen: new Date().toISOString()
      })
      .eq('instance_name', instanceName);

    if (error) {
      console.error('Error updating connection status:', error);
    } else {
      console.log('Connection status updated for instance:', instanceName);
    }
  } catch (error) {
    console.error('Error handling connection update:', error);
  }
}