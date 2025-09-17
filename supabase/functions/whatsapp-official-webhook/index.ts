
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

console.log('🚀 WhatsApp Webhook Function Started');

serve(async (req) => {
  console.log('📨 New Request:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
    searchParams: Object.fromEntries(new URL(req.url).searchParams.entries())
  });

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    console.log('🔍 GET Request - Verification');
    
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    
    console.log('📝 Verification params:', { mode, token, challenge });
    
    const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || '123456789';
    
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('✅ Webhook verified successfully');
      return new Response(challenge, { 
        status: 200,
        headers: corsHeaders 
      });
    } else {
      console.log('❌ Webhook verification failed');
      return new Response('Forbidden', { 
        status: 403,
        headers: corsHeaders 
      });
    }
  }

  if (req.method === 'POST') {
    console.log('📩 POST Request - Message Processing');
    
    try {
      const body = await req.json();
      console.log('📝 Webhook Body:', JSON.stringify(body, null, 2));

      if (body.object === 'whatsapp_business_account') {
        console.log('📱 Processing WhatsApp Business Account webhook');

        for (const entry of body.entry) {
          console.log('🔄 Processing entry:', entry.id);
          
          const messages = entry.changes?.[0]?.value?.messages || [];
          const contacts = entry.changes?.[0]?.value?.contacts || [];
          const statuses = entry.changes?.[0]?.value?.statuses || [];
          const phone_number_id = entry.changes?.[0]?.value?.metadata?.phone_number_id;

          console.log('📊 Processing data:', {
            messages_count: messages.length,
            contacts_count: contacts.length,
            statuses_count: statuses.length,
            phone_number_id
          });

          // Process status updates
          for (const status of statuses) {
            console.log('📊 Processing status update:', status.id, status.status);
            
            if (status.errors) {
              console.error('📊 Status has errors:', status.errors);
              // Só marca como failed se realmente houver erros críticos
              const hasCriticalError = status.errors.some(error => 
                error.code !== 131047 && error.code !== 131026 // Códigos de erro comuns que não são críticos
              );
              
              if (hasCriticalError) {
                await supabase
                  .from('whatsapp_messages')
                  .update({ status: 'failed' })
                  .eq('message_id', status.id);
                
                // Also update campaign recipient if this is a campaign message
                await supabase
                  .from('campaign_recipients')
                  .update({ 
                    status: 'failed',
                    failed_at: new Date().toISOString(),
                    error_message: status.errors.map(e => e.message).join(', ')
                  })
                  .eq('message_id', status.id);
              }
            } else {
              // Atualiza o status normalmente se não há erros
              await supabase
                .from('whatsapp_messages')
                .update({ status: status.status })
                .eq('message_id', status.id);
              
              // Also update campaign recipient if this is a campaign message
              const updateData: any = { status: status.status };
              
              if (status.status === 'delivered') {
                updateData.delivered_at = new Date().toISOString();
              } else if (status.status === 'read') {
                updateData.read_at = new Date().toISOString();
                // Mark as delivered if not already marked
                if (!updateData.delivered_at) {
                  updateData.delivered_at = new Date().toISOString();
                }
              }
              
              await supabase
                .from('campaign_recipients')
                .update(updateData)
                .eq('message_id', status.id);
            }
              
            console.log('✅ Status updated successfully');
          }

          // Process incoming messages
          for (const message of messages) {
            console.log('📨 Processing incoming message:', message.id);
            console.log('📨 Message details:', JSON.stringify(message, null, 2));
            
            const contact = contacts.find(c => c.wa_id === message.from);
            const contactName = contact?.profile?.name || null;
            const phoneNumber = message.from;
            
            console.log('📞 Contact info:', { phoneNumber, contactName });

            // Find workspace by WhatsApp configuration
            const { data: config } = await supabase
              .from('whatsapp_official_configs')
              .select('workspace_id, access_token')
              .eq('phone_number_id', phone_number_id)
              .eq('is_active', true)
              .single();

            if (!config) {
              console.log('⚠️ No active WhatsApp config found for phone_number_id:', phone_number_id);
              continue;
            }

            console.log('🏢 Workspace found:', config.workspace_id);

            // Check for existing lead with this phone
            const { data: existingLead } = await supabase
              .from('leads')
              .select('id, name')
              .eq('workspace_id', config.workspace_id)
              .eq('phone', phoneNumber)
              .single();

            console.log('👤 Lead check:', existingLead ? 'Found existing lead' : 'No lead found');

            // Find or create conversation
            let conversation;
            const { data: existingConversation } = await supabase
              .from('whatsapp_conversations')
              .select('*')
              .eq('workspace_id', config.workspace_id)
              .eq('phone_number', phoneNumber)
              .single();

            if (existingConversation) {
              console.log('💬 Using existing conversation:', existingConversation.id);
              conversation = existingConversation;
              
              // Update conversation info
              await supabase
                .from('whatsapp_conversations')
                .update({
                  contact_name: contactName || existingConversation.contact_name,
                  lead_id: existingLead?.id || existingConversation.lead_id,
                  last_message_at: new Date().toISOString(),
                  is_read: false
                })
                .eq('id', existingConversation.id);
            } else {
              console.log('💬 Creating new conversation');
              const { data: newConversation } = await supabase
                .from('whatsapp_conversations')
                .insert({
                  workspace_id: config.workspace_id,
                  phone_number: phoneNumber,
                  contact_name: contactName,
                  lead_id: existingLead?.id || null,
                  is_read: false
                })
                .select()
                .single();
              
              conversation = newConversation;
              console.log('✅ New conversation created:', conversation.id);
            }

            // Helper function to download media with better error handling
            async function downloadMedia(mediaId: string, mediaType: string): Promise<string | null> {
              try {
                console.log('📥 Downloading media:', mediaId, 'type:', mediaType);
                
                // First, get the media URL from WhatsApp API
                const mediaResponse = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
                  headers: { 'Authorization': `Bearer ${config.access_token}` }
                });
                
                if (!mediaResponse.ok) {
                  const errorText = await mediaResponse.text();
                  console.error('❌ Failed to get media URL:', mediaResponse.status, mediaResponse.statusText, errorText);
                  return null;
                }
                
                const mediaData = await mediaResponse.json();
                console.log('📋 Media data received:', JSON.stringify(mediaData, null, 2));
                
                if (!mediaData.url) {
                  console.error('❌ No URL in media data');
                  return null;
                }
                
                // Test if the URL is accessible
                try {
                  const testResponse = await fetch(mediaData.url, {
                    method: 'HEAD',
                    headers: { 'Authorization': `Bearer ${config.access_token}` }
                  });
                  
                  if (!testResponse.ok) {
                    console.error('❌ Media URL not accessible:', testResponse.status);
                    return null;
                  }
                  
                  console.log('✅ Media URL is accessible:', mediaData.url);
                } catch (testError) {
                  console.error('❌ Error testing media URL:', testError);
                  return null;
                }
                
                console.log('✅ Media download URL obtained:', mediaData.url);
                return mediaData.url;
                
              } catch (error) {
                console.error('❌ Error downloading media:', error);
                return null;
              }
            }

            // Process message content
            let messageText = '';
            let messageType = 'text';
            let mediaUrl = null;
            let mediaType = null;
            let attachmentName = null;

            if (message.text) {
              messageText = message.text.body;
              messageType = 'text';
              console.log('💬 Text message:', messageText);
            } else if (message.image) {
              messageText = message.image.caption || '📷 Imagem';
              messageType = 'image';
              mediaType = message.image.mime_type;
              attachmentName = message.image.filename || 'image.jpg';
              mediaUrl = await downloadMedia(message.image.id, 'image');
              console.log('🖼️ Image message processed, URL:', mediaUrl);
              
              // For image messages, save to permanent storage
              if (mediaUrl) {
                try {
                  console.log('🖼️ Attempting to save image to permanent storage...');
                  
                  // Download the image file
                  const imageResponse = await fetch(mediaUrl, {
                    headers: { 'Authorization': `Bearer ${config.access_token}` }
                  });
                  
                  if (imageResponse.ok) {
                    const imageBuffer = await imageResponse.arrayBuffer();
                    const imageBlob = new Uint8Array(imageBuffer);
                    
                    // Generate a unique filename with proper extension
                    const timestamp = Date.now();
                    const extension = attachmentName?.split('.').pop() || 'jpg';
                    const fileName = `received_image_${message.id}_${timestamp}.${extension}`;
                    
                    // Save to Supabase Storage
                    const { data: uploadData, error: uploadError } = await supabase.storage
                      .from('whatsapp-images')
                      .upload(fileName, imageBlob, {
                        contentType: mediaType || 'image/jpeg',
                        upsert: false
                      });
                    
                    if (uploadError) {
                      console.error('❌ Error uploading image to storage:', uploadError);
                    } else {
                      console.log('✅ Image uploaded to storage:', uploadData.path);
                      
                      // Get the public URL
                      const { data: urlData } = supabase.storage
                        .from('whatsapp-images')
                        .getPublicUrl(fileName);
                      
                      if (urlData?.publicUrl) {
                        console.log('✅ Permanent image URL generated:', urlData.publicUrl);
                        // Update mediaUrl to use the permanent Supabase URL
                        mediaUrl = urlData.publicUrl;
                      }
                    }
                  }
                } catch (imageError) {
                  console.error('❌ Error processing image for permanent storage:', imageError);
                }
              }
            } else if (message.audio) {
              messageText = '🎤 Mensagem de áudio';
              messageType = 'audio';
              mediaType = message.audio.mime_type;
              attachmentName = message.audio.filename || 'audio.ogg';
              mediaUrl = await downloadMedia(message.audio.id, 'audio');
              console.log('🎵 Audio message processed, URL:', mediaUrl);
              
              // For audio messages, also try to save to permanent storage
              if (mediaUrl) {
                try {
                  console.log('🎵 Attempting to save audio to permanent storage...');
                  
                  // Download the audio file
                  const audioResponse = await fetch(mediaUrl, {
                    headers: { 'Authorization': `Bearer ${config.access_token}` }
                  });
                  
                  if (audioResponse.ok) {
                    const audioBuffer = await audioResponse.arrayBuffer();
                    const audioBlob = new Uint8Array(audioBuffer);
                    
                    // Generate a unique filename
                    const timestamp = Date.now();
                    const fileName = `received_audio_${message.id}_${timestamp}.ogg`;
                    
                    // Save to Supabase Storage
                    const { data: uploadData, error: uploadError } = await supabase.storage
                      .from('whatsapp-audio')
                      .upload(fileName, audioBlob, {
                        contentType: mediaType || 'audio/ogg',
                        upsert: false
                      });
                    
                    if (uploadError) {
                      console.error('❌ Error uploading audio to storage:', uploadError);
                    } else {
                      console.log('✅ Audio uploaded to storage:', uploadData.path);
                      
                      // Get the public URL
                      const { data: urlData } = supabase.storage
                        .from('whatsapp-audio')
                        .getPublicUrl(fileName);
                      
                      if (urlData?.publicUrl) {
                        console.log('✅ Permanent audio URL generated:', urlData.publicUrl);
                        // We'll update the message with permanent URL after saving the initial message
                      }
                    }
                  }
                } catch (audioError) {
                  console.error('❌ Error processing audio for permanent storage:', audioError);
                }
              }
            } else if (message.video) {
              messageText = message.video.caption || '🎥 Vídeo';
              messageType = 'video';
              mediaType = message.video.mime_type;
              attachmentName = message.video.filename || 'video.mp4';
              mediaUrl = await downloadMedia(message.video.id, 'video');
              console.log('🎬 Video message processed, URL:', mediaUrl);
            } else if (message.document) {
              messageText = `📄 ${message.document.filename || 'Documento'}`;
              messageType = 'document';
              mediaType = message.document.mime_type;
              attachmentName = message.document.filename;
              mediaUrl = await downloadMedia(message.document.id, 'document');
              console.log('📄 Document message processed, URL:', mediaUrl);
            } else {
              messageText = 'Mensagem não suportada';
              messageType = 'unknown';
              console.log('❓ Unknown message type');
            }

            // Save message with media information
            const messageData = {
              conversation_id: conversation.id,
              message_text: messageText,
              message_type: messageType,
              is_from_lead: true,
              message_id: message.id,
              timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
              media_url: mediaUrl,
              media_type: mediaType,
              attachment_name: attachmentName
            };

            console.log('💾 Saving message:', JSON.stringify(messageData, null, 2));

            const { data: savedMessage, error: messageError } = await supabase
              .from('whatsapp_messages')
              .insert(messageData)
              .select()
              .single();

            if (messageError) {
              console.error('❌ Error saving message:', messageError);
            } else {
              console.log('✅ Message saved successfully with media data');
              
              // For audio messages, try to update with permanent URL if we managed to upload it
              if (messageType === 'audio' && mediaUrl && savedMessage) {
                try {
                  console.log('🎵 Attempting to process audio for permanent storage...');
                  
                  // Download the audio file
                  const audioResponse = await fetch(mediaUrl, {
                    headers: { 'Authorization': `Bearer ${config.access_token}` }
                  });
                  
                  if (audioResponse.ok) {
                    const audioBuffer = await audioResponse.arrayBuffer();
                    const audioBlob = new Uint8Array(audioBuffer);
                    
                    // Generate a unique filename
                    const timestamp = Date.now();
                    const fileName = `received_audio_${savedMessage.id}_${timestamp}.ogg`;
                    
                    // Save to Supabase Storage
                    const { data: uploadData, error: uploadError } = await supabase.storage
                      .from('whatsapp-audio')
                      .upload(fileName, audioBlob, {
                        contentType: mediaType || 'audio/ogg',
                        upsert: false
                      });
                    
                    if (uploadError) {
                      console.error('❌ Error uploading audio to storage:', uploadError);
                    } else {
                      console.log('✅ Audio uploaded to storage:', uploadData.path);
                      
                      // Get the public URL
                      const { data: urlData } = supabase.storage
                        .from('whatsapp-audio')
                        .getPublicUrl(fileName);
                      
                      if (urlData?.publicUrl) {
                        console.log('✅ Permanent audio URL generated:', urlData.publicUrl);
                        
                        // Update the message with permanent URL
                        await supabase
                          .from('whatsapp_messages')
                          .update({ 
                            permanent_audio_url: urlData.publicUrl,
                            status: 'processed'
                          })
                          .eq('id', savedMessage.id);
                        
                        console.log('✅ Message updated with permanent audio URL');
                      }
                    }
                  }
                } catch (audioError) {
                  console.error('❌ Error processing audio for permanent storage:', audioError);
                }
              }
            }

            // Update message count
            const { data: messageCount } = await supabase
              .from('whatsapp_messages')
              .select('id', { count: 'exact' })
              .eq('conversation_id', conversation.id);

            await supabase
              .from('whatsapp_conversations')
              .update({ 
                message_count: messageCount?.length || 0,
                last_message_at: new Date().toISOString()
              })
              .eq('id', conversation.id);
          }
        }

        console.log('✅ Webhook processed successfully');
        return new Response('OK', { 
          status: 200,
          headers: corsHeaders 
        });
      }

      return new Response('OK', { 
        status: 200,
        headers: corsHeaders 
      });

    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      return new Response('Internal Server Error', { 
        status: 500,
        headers: corsHeaders 
      });
    }
  }

  return new Response('Method Not Allowed', { 
    status: 405,
    headers: corsHeaders 
  });
});
