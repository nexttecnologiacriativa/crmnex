import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Ensures phone number has Brazil country code (55) for sending messages
 * FIXED: Handles 12-digit Brazilian mobile numbers (missing the "9")
 */
function ensureCountryCode55(phone: string): string {
  if (!phone) return '';
  
  const digitsOnly = phone.replace(/\D/g, '');
  
  // If already has 55 prefix
  if (digitsOnly.startsWith('55')) {
    // If has 13+ digits, correct length
    if (digitsOnly.length >= 13) {
      return digitsOnly;
    }
    
    // If has 12 digits (mobile without the 9), add 9 after DDD
    // Format: 55 + DDD(2) + number(8) -> 55 + DDD(2) + 9 + number(8)
    if (digitsOnly.length === 12) {
      const ddi = digitsOnly.slice(0, 2);   // 55
      const ddd = digitsOnly.slice(2, 4);   // DDD (area code)
      const numero = digitsOnly.slice(4);    // 8 digits
      return `${ddi}${ddd}9${numero}`;       // 55 + DDD + 9 + number
    }
    
    // Return as is for other cases
    return digitsOnly;
  }
  
  // If doesn't have 55, add it
  return `55${digitsOnly}`;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')!;
const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    let bodyData;
    try {
      bodyData = await req.json();
    } catch (jsonError) {
      console.error('❌ Error parsing JSON:', jsonError);
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body',
        details: jsonError?.message 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const { action, instanceName, workspaceId, phone, message, originalName } = bodyData;
    
    console.log('🚀 Edge Function called:', { action, instanceName, workspaceId });

    // Use global Evolution API credentials from Supabase secrets
    const currentApiKey = evolutionApiKey;
    const currentApiUrl = evolutionApiUrl;
    
    console.log('🔧 Using global API config:', { 
      currentApiUrl, 
      hasCurrentApiKey: !!currentApiKey 
    });

    switch (action) {
      case 'recreate_instance': {
        const { oldInstanceName, newInstanceName, workspaceId: wsId } = bodyData;
        
        if (!oldInstanceName || !newInstanceName || !wsId) {
          return new Response(
            JSON.stringify({ 
              error: 'Missing required parameters: oldInstanceName, newInstanceName, workspaceId' 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log('🔄 Recreating instance:', { oldInstanceName, newInstanceName, wsId });
        
        try {
          // 1. Delete old instance from Evolution API
          console.log('🗑️ Deleting old instance from Evolution API:', oldInstanceName);
          const deleteResponse = await fetch(`${currentApiUrl}/instance/delete/${oldInstanceName}`, {
            method: 'DELETE',
            headers: {
              'apikey': currentApiKey
            }
          });
          
          if (!deleteResponse.ok) {
            const deleteError = await deleteResponse.text();
            console.error('❌ Failed to delete old instance:', deleteError);
            // Continue anyway - instance might not exist in API
          } else {
            console.log('✅ Old instance deleted from Evolution API');
          }
          
          // 2. Create new instance with correct name
          console.log('🆕 Creating new instance in Evolution API:', newInstanceName);
          const createResult = await createInstance(
            newInstanceName, 
            wsId, 
            supabase, 
            currentApiUrl, 
            currentApiKey,
            newInstanceName // originalName
          );
          
          return createResult;
        } catch (error) {
          console.error('❌ Error recreating instance:', error);
          return new Response(
            JSON.stringify({ error: (error as Error).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      case 'create_instance':
        return await createInstance(instanceName, workspaceId, supabase, currentApiUrl, currentApiKey, originalName);
      case 'get_qr':
        return await getQRCode(instanceName, workspaceId, supabase, currentApiUrl, currentApiKey);
      case 'get_status':
        return await getInstanceStatus(instanceName, supabase, currentApiUrl, currentApiKey);
      case 'send_message':
        return await sendMessage(instanceName, phone, message, supabase, currentApiUrl, currentApiKey, workspaceId);
      case 'send_image':
        return await sendImage(instanceName, phone, bodyData?.imageUrl, bodyData?.caption || '', supabase, currentApiUrl, currentApiKey, workspaceId);
      case 'checkWhatsApp':
        return await checkWhatsApp(phone, workspaceId, supabase, currentApiUrl, currentApiKey);
      case 'sendMedia': {
        const mediaInstanceName = bodyData.instanceName || instanceName;
        const mediaNumber = bodyData.number || phone;
        const mediaBase64 = bodyData.mediaBase64;
        const mediaType = bodyData.mediaType;
        const fileName = bodyData.fileName || 'media';
        const mediaWorkspaceId = bodyData.workspaceId || workspaceId;
        
        console.log('📎 SendMedia action received:', { 
          mediaInstanceName, 
          mediaNumber, 
          mediaType, 
          fileName,
          hasMediaBase64: !!mediaBase64,
          mediaWorkspaceId 
        });
        
        if (!mediaInstanceName || !mediaNumber || !mediaBase64) {
          return new Response(
            JSON.stringify({ 
              error: 'Parâmetros obrigatórios ausentes para sendMedia',
              missing: {
                instanceName: !mediaInstanceName,
                number: !mediaNumber,
                mediaBase64: !mediaBase64
              }
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        try {
          const mediaResult = await sendMediaGeneric(
            mediaInstanceName,
            mediaNumber,
            mediaBase64,
            mediaType,
            fileName,
            supabase,
            currentApiUrl,
            currentApiKey,
            mediaWorkspaceId
          );
          return new Response(
            JSON.stringify({ success: true, result: mediaResult }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('❌ Error in sendMedia case:', error);
          return new Response(
            JSON.stringify({ error: (error as Error).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      case 'sendMediaUrl': {
        const mediaUrlInstanceName = bodyData.instanceName || instanceName;
        const mediaUrlNumber = bodyData.number || phone;
        const mediaUrl = bodyData.mediaUrl;
        const mediaUrlType = bodyData.mediaType || 'image';
        const mediaUrlFileName = bodyData.fileName || 'media';
        const mediaUrlCaption = bodyData.caption || '';
        const mediaUrlWorkspaceId = bodyData.workspaceId || workspaceId;
        
        console.log('📎 SendMediaUrl action received:', { 
          mediaUrlInstanceName, 
          mediaUrlNumber, 
          mediaUrlType,
          mediaUrl: mediaUrl?.substring(0, 100) + '...',
          mediaUrlWorkspaceId,
          apiUrl: currentApiUrl, 
          hasApiKey: !!currentApiKey 
        });
        
        if (!mediaUrlInstanceName || !mediaUrlNumber || !mediaUrl) {
          console.log('❌ Missing required parameters for sendMediaUrl:', {
            hasInstanceName: !!mediaUrlInstanceName,
            hasNumber: !!mediaUrlNumber,
            hasMediaUrl: !!mediaUrl,
            instanceName: mediaUrlInstanceName,
            number: mediaUrlNumber,
            mediaUrl: mediaUrl?.substring(0, 50)
          });
          return new Response(
            JSON.stringify({ 
              error: 'Parâmetros obrigatórios ausentes para sendMediaUrl',
              missing: {
                instanceName: !mediaUrlInstanceName,
                number: !mediaUrlNumber,
                mediaUrl: !mediaUrl
              },
              received: {
                instanceName: mediaUrlInstanceName,
                number: mediaUrlNumber,
                mediaUrl: mediaUrl?.substring(0, 50)
              }
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          // Find conversation
          const { data: conversationRecord } = await supabase
            .from('whatsapp_conversations')
            .select('id, message_count')
            .eq('workspace_id', mediaUrlWorkspaceId)
            .eq('phone_number', mediaUrlNumber)
            .single();
          
          let conversation = conversationRecord;
          if (!conversation) {
            const { data: newConversation, error: convError } = await supabase
              .from('whatsapp_conversations')
              .insert({
                phone_number: mediaUrlNumber,
                workspace_id: mediaUrlWorkspaceId,
                contact_name: mediaUrlNumber,
                last_message_at: new Date().toISOString(),
                message_count: 0
              })
              .select()
              .single();
              
            if (convError) {
              console.error('❌ Error creating conversation:', convError);
              throw new Error(`Failed to create conversation: ${convError.message}`);
            }
            
            conversation = newConversation;
          }

          // Detect mimetype based on file extension for more accuracy
          const getMimeType = (mediaType: string, fileName: string): string => {
            const ext = fileName.split('.').pop()?.toLowerCase();
            
            if (mediaType === 'document') {
              const docMimes: Record<string, string> = {
                'pdf': 'application/pdf',
                'doc': 'application/msword',
                'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'xls': 'application/vnd.ms-excel',
                'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'txt': 'text/plain'
              };
              return docMimes[ext || ''] || 'application/octet-stream';
            }
            
            if (mediaType === 'video') {
              const videoMimes: Record<string, string> = {
                'mp4': 'video/mp4',
                'mov': 'video/quicktime',
                '3gp': 'video/3gpp',
                '3gpp': 'video/3gpp'
              };
              return videoMimes[ext || ''] || 'video/mp4';
            }
            
            if (mediaType === 'audio') {
              return 'audio/mpeg';
            }
            
            if (mediaType === 'image') {
              return 'image/jpeg';
            }
            
            return 'application/octet-stream';
          };

          const mimetype = getMimeType(mediaUrlType, mediaUrlFileName);
          
          // For videos and documents: send URL directly (avoids 413 error)
          // For images: use base64 (more reliable and already working)
          let body: any;
          let response: Response;
          
          if (mediaUrlType === 'video' || mediaUrlType === 'document') {
            console.log(`📎 Sending ${mediaUrlType} via direct URL (no base64 to avoid 413 error)`);
            
            body = {
              number: mediaUrlNumber.replace(/\D/g, ''),
              mediatype: mediaUrlType,
              mimetype: mimetype,
              media: mediaUrl, // Direct URL (no base64)
              fileName: mediaUrlFileName,
              caption: mediaUrlCaption || ''
            };
            
            console.log('📎 Request to Evolution API:', {
              url: `${currentApiUrl}/message/sendMedia/${mediaUrlInstanceName}`,
              body: { ...body, media: '[URL]' }
            });
            
            response = await fetch(`${currentApiUrl}/message/sendMedia/${mediaUrlInstanceName}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': currentApiKey,
              },
              body: JSON.stringify(body)
            });
          } else if (mediaUrlType === 'audio') {
            // AUDIO: Use sendWhatsAppAudio endpoint for proper audio handling
            console.log('🎵 Sending audio via sendWhatsAppAudio endpoint');
            console.log('📥 Downloading audio from Supabase Storage:', mediaUrl);
            
            const audioResponse = await fetch(mediaUrl);
            
            if (!audioResponse.ok) {
              throw new Error(`Failed to download audio from storage: ${audioResponse.status}`);
            }
            
            const audioBuffer = await audioResponse.arrayBuffer();
            const uint8Array = new Uint8Array(audioBuffer);
            let binaryString = '';
            
            // Convert to base64 in chunks to avoid stack overflow for large files
            const chunkSize = 8192;
            for (let i = 0; i < uint8Array.length; i += chunkSize) {
              const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
              for (let j = 0; j < chunk.length; j++) {
                binaryString += String.fromCharCode(chunk[j]);
              }
            }
            
            const base64Audio = btoa(binaryString);
            console.log(`✅ Audio downloaded and converted to base64 (${audioBuffer.byteLength} bytes)`);
            
            // Use the dedicated sendWhatsAppAudio endpoint
            const audioBody = {
              number: ensureCountryCode55(mediaUrlNumber),
              audio: base64Audio,
              delay: 1200
            };
            
            console.log('📤 Sending to sendWhatsAppAudio endpoint:', {
              endpoint: `${currentApiUrl}/message/sendWhatsAppAudio/${mediaUrlInstanceName}`,
              number: audioBody.number,
              audioLength: base64Audio.length
            });
            
            response = await fetch(`${currentApiUrl}/message/sendWhatsAppAudio/${mediaUrlInstanceName}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': currentApiKey,
              },
              body: JSON.stringify(audioBody)
            });
          } else {
            // Images: download and convert to base64 (existing behavior)
            console.log('📥 Downloading image from Supabase Storage:', mediaUrl);
            const imageResponse = await fetch(mediaUrl);
            
            if (!imageResponse.ok) {
              throw new Error(`Failed to download image from storage: ${imageResponse.status}`);
            }

            const imageBuffer = await imageResponse.arrayBuffer();
            const uint8Array = new Uint8Array(imageBuffer);
            let binaryString = '';
            
            for (let i = 0; i < uint8Array.length; i++) {
              binaryString += String.fromCharCode(uint8Array[i]);
            }

            const base64Image = btoa(binaryString);
            
            console.log(`✅ Image downloaded and converted to base64 (${imageBuffer.byteLength} bytes)`);
            
            body = {
              number: mediaUrlNumber.replace(/\D/g, ''),
              mediatype: mediaUrlType,
              mimetype: mimetype,
              media: base64Image, // base64 at root level
              fileName: mediaUrlFileName,
              caption: mediaUrlCaption
            };

            console.log('📎 Sending image with base64 to Evolution API...');
            response = await fetch(`${currentApiUrl}/message/sendMedia/${mediaUrlInstanceName}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': currentApiKey,
              },
              body: JSON.stringify(body)
            });
          }

          // Get response as text first to handle non-JSON responses
          const responseText = await response.text();
          
          if (!response.ok) {
            console.error('❌ Evolution API error response:', {
              status: response.status,
              statusText: response.statusText,
              body: responseText.substring(0, 500)
            });
            throw new Error(`Failed to send media: ${response.status} - ${responseText.substring(0, 200)}`);
          }

          // Try to parse as JSON
          let result;
          try {
            result = JSON.parse(responseText);
          } catch (parseError) {
            console.error('❌ Failed to parse response as JSON:', responseText.substring(0, 500));
            throw new Error('API returned invalid JSON response');
          }
          
          console.log('📎 Evolution API media send result:', result);

          // Save message record to database with Storage URL (not WhatsApp URL)
          const { error: saveError } = await supabase
            .from('whatsapp_messages')
            .insert({
              conversation_id: conversation.id,
              message_text: mediaUrlCaption || `[${mediaUrlType} enviado]`,
              message_type: mediaUrlType,
              is_from_lead: false,
              status: 'sent',
              media_url: mediaUrl,  // Keep original Storage URL
              media_type: mediaUrlType,
              attachment_name: mediaUrlFileName,
              message_id: result.key?.id,
              timestamp: new Date().toISOString()
            });

          if (saveError) {
            console.error('❌ Error saving media message to database:', saveError);
          } else {
            console.log('✅ Message saved to database with Storage URL');
          }

          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Media sent successfully',
              messageId: result.key?.id,
              conversationId: conversation.id
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('❌ Error in sendMediaUrl case:', error);
          return new Response(
            JSON.stringify({ error: (error as Error).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      case 'sendAudio': {
        const audioInstanceName = bodyData.instanceName || bodyData.instance;
        const audioNumber = bodyData.number || bodyData.phone;
        const audioBase64 = bodyData.audioBase64 || bodyData.audio;
        const audioWorkspaceId = bodyData.workspaceId || workspaceId;
        console.log('🎵 SendAudio action received:', { audioInstanceName, audioNumber, audioBase64: audioBase64?.substring(0, 50) + '...', audioWorkspaceId, apiUrl: currentApiUrl, hasApiKey: !!currentApiKey });
        
        if (!audioInstanceName || !audioNumber || !audioBase64) {
          console.log('❌ Missing required parameters for sendAudio:', {
            hasInstanceName: !!audioInstanceName,
            hasNumber: !!audioNumber,
            hasAudioBase64: !!audioBase64,
            instanceName: audioInstanceName,
            number: audioNumber,
            audioBase64Length: audioBase64?.length
          });
          return new Response(
            JSON.stringify({ 
              error: 'Parâmetros obrigatórios ausentes para sendAudio',
              missing: {
                instanceName: !audioInstanceName,
                number: !audioNumber,
                audioBase64: !audioBase64
              },
              received: {
                instanceName: audioInstanceName,
                number: audioNumber,
                audioBase64: audioBase64 ? `${audioBase64.length} chars` : 'null'
              }
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        try {
          const audioResult = await sendAudio(
            audioInstanceName,
            audioNumber,
            audioBase64,
            supabase,
            currentApiUrl,
            currentApiKey,
            audioWorkspaceId
          );
          return new Response(
            JSON.stringify({ success: true, result: audioResult }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('❌ Error in sendAudio case:', error);
          return new Response(
            JSON.stringify({ error: (error as Error).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      case 'verify_instance':
        return await verifyInstance(instanceName, supabase, currentApiUrl, currentApiKey);
      case 'list_instances':
        return await listInstances(workspaceId, supabase, currentApiUrl, currentApiKey);
      case 'configure_webhook':
        return await configureWebhook(instanceName, workspaceId, supabase, currentApiUrl, currentApiKey);
      case 'test_webhook':
        return await testWebhook(instanceName, workspaceId, supabase, currentApiUrl, currentApiKey);
      case 'get_webhook_status':
        return await getWebhookStatus(instanceName, supabase, currentApiUrl, currentApiKey);
      case 'diagnose_webhook':
        return await diagnoseWebhook(instanceName, supabase, currentApiUrl, currentApiKey);
      case 'fix_webhook':
        return await fixWebhook(instanceName, supabase, currentApiUrl, currentApiKey);
      case 'diagnose_all_instances':
        return await diagnoseAllInstances(workspaceId, supabase, currentApiUrl, currentApiKey);
      case 'reconfigure_all_instances':
        return await reconfigureAllInstances(workspaceId, supabase, currentApiUrl, currentApiKey);
      
      case 'fetch_profile_picture': {
        const { phoneNumber, workspaceId: wsId } = bodyData;
        
        if (!instanceName || !phoneNumber || !wsId) {
          return new Response(
            JSON.stringify({ error: 'Missing required parameters: instanceName, phoneNumber, workspaceId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log('📸 Fetching profile picture:', { instanceName, phoneNumber, wsId });
        
        try {
          const cleanNumber = phoneNumber.replace(/\D/g, '');
          
          const response = await fetch(`${currentApiUrl}/chat/fetchProfilePictureUrl/${instanceName}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': currentApiKey,
            },
            body: JSON.stringify({ number: cleanNumber })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Evolution API error fetching profile picture:', errorText);
            return new Response(
              JSON.stringify({ error: 'Failed to fetch profile picture', details: errorText }),
              { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          const result = await response.json();
          console.log('📸 Profile picture result:', result);
          
          // Save to database if we got a picture URL
          if (result.profilePictureUrl || result.pictureUrl) {
            const pictureUrl = result.profilePictureUrl || result.pictureUrl;
            
            const { error: updateError } = await supabase
              .from('whatsapp_conversations')
              .update({ profile_picture_url: pictureUrl })
              .eq('phone_number', phoneNumber)
              .eq('workspace_id', wsId);
              
            if (updateError) {
              console.error('❌ Error updating profile picture in database:', updateError);
            } else {
              console.log('✅ Profile picture saved to database');
            }
            
            return new Response(
              JSON.stringify({ success: true, profilePictureUrl: pictureUrl }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          return new Response(
            JSON.stringify({ success: false, message: 'No profile picture available' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('❌ Error fetching profile picture:', error);
          return new Response(
            JSON.stringify({ error: (error as Error).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      default:
        console.log('❌ Invalid action received:', action, 'Available actions:', ['create_instance', 'get_qr', 'get_status', 'send_message', 'send_image', 'sendMedia', 'sendAudio', 'verify_instance', 'list_instances', 'configure_webhook', 'test_webhook', 'get_webhook_status', 'reconfigure_all_instances']);
        throw new Error(`Invalid action: ${action}`);
    }
  } catch (error) {
    console.error('❌ Error in whatsapp-evolution function:', error);
    console.error('❌ Error stack:', error?.stack);
    console.error('❌ Error details:', {
      name: error?.name,
      message: error?.message,
      cause: error?.cause
    });
    
    // Extract full error message including all details
    const fullErrorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(JSON.stringify({ 
      error: fullErrorMessage,
      name: error?.name || 'UnknownError',
      details: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createInstance(instanceName: string, workspaceId: string, supabase: any, apiUrl: string, apiKey: string, originalName?: string) {
  try {
    // Generate workspace prefix for security
    const workspacePrefix = `ws_${workspaceId.substring(0, 8)}_`;
    
    // If instanceName doesn't have prefix, add it (for security isolation)
    const secureInstanceName = instanceName.startsWith(workspacePrefix) ? instanceName : `${workspacePrefix}${instanceName}`;
    
    console.log(`🚀 Creating instance ${secureInstanceName} (original: ${instanceName}) for workspace ${workspaceId}`);
    console.log(`🔧 Using API URL: ${apiUrl}, has API key: ${!!apiKey}`);

    // Verificar se instância já existe no banco antes de criar
    const { data: existingInstance } = await supabase
      .from('whatsapp_instances')
      .select('id, instance_name, status')
      .eq('workspace_id', workspaceId)
      .eq('instance_name', secureInstanceName)
      .maybeSingle();

    if (existingInstance) {
      console.log(`⚠️ Instance ${secureInstanceName} already exists in database with status: ${existingInstance.status}`);
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Instance already exists',
        data: existingInstance,
        status: existingInstance.status
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const payload = {
      instanceName: secureInstanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      webhook: {
        url: `https://mqotdnvwyjhyiqzbefpm.supabase.co/functions/v1/whatsapp-webhook`,
        events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "SEND_MESSAGE", "QRCODE_UPDATED"]
      },
      settings: {
        rejectCall: false,
        msgCall: "",
        groupsIgnore: false,
        alwaysOnline: true,
        readMessages: false,
        readStatus: true,
        syncFullHistory: false
      }
    };

    console.log(`📤 Sending payload to Evolution API:`, JSON.stringify(payload, null, 2));

    const response = await fetch(`${apiUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify(payload),
    });

    console.log(`📨 Evolution API response status: ${response.status}`);
    const responseText = await response.text();
    console.log(`📨 Evolution API response body:`, responseText);

    if (!response.ok) {
      console.error(`❌ Evolution API error response:`, responseText);
      
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { message: responseText };
      }
      
        // Se a instância já existe na Evolution API, não é erro fatal
        if (response.status === 409 || responseText.includes('already exists') || responseText.includes('já existe')) {
          console.log(`📝 Instance ${secureInstanceName} already exists in Evolution API, proceeding to save in database...`);
          
          // Salvar no banco mesmo assim
          const { data: instanceData, error: instanceError } = await supabase
            .from('whatsapp_instances')
            .insert({
              instance_name: secureInstanceName,
              instance_key: secureInstanceName,
              workspace_id: workspaceId,
              status: 'close', // Default status para instâncias que já existem
              webhook_url: `https://mqotdnvwyjhyiqzbefpm.supabase.co/functions/v1/whatsapp-webhook`,
            })
            .select()
            .single();

          if (instanceError) {
            console.error('❌ Error saving existing instance to Supabase:', instanceError);
            // Tentar buscar se já existe no banco (race condition)
            const { data: existingInDb } = await supabase
              .from('whatsapp_instances')
              .select('*')
              .eq('workspace_id', workspaceId)
              .eq('instance_name', secureInstanceName)
              .maybeSingle();
              
            if (existingInDb) {
              return new Response(JSON.stringify({ 
                success: true,
                message: 'Instance recovered from database',
                data: existingInDb,
                status: existingInDb.status
              }), { 
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              });
            }
            throw new Error(`Failed to save existing instance to Supabase: ${instanceError.message}`);
          }

          return new Response(JSON.stringify({ 
            success: true,
            message: 'Instance already existed, saved to database',
            data: instanceData,
            status: 'close'
          }), { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }
      
      throw new Error(`Failed to create instance on Evolution API: ${response.status} - ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`✅ Instance ${instanceName} created on Evolution API:`, JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.error('❌ Failed to parse Evolution API response:', parseError);
      throw new Error('Invalid JSON response from Evolution API');
    }

    // Tentar salvar no Supabase com múltiplas tentativas
    let instanceData = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts && !instanceData) {
      attempts++;
      console.log(`💾 Attempt ${attempts}/${maxAttempts} to save instance to Supabase...`);
      
      try {
        const { data: insertResult, error: instanceError } = await supabase
          .from('whatsapp_instances')
          .insert({
            instance_name: secureInstanceName,
            instance_key: data.instance?.instanceName || secureInstanceName,
            workspace_id: workspaceId,
            status: 'close', // Status inicial mais conservador
            webhook_url: `https://mqotdnvwyjhyiqzbefpm.supabase.co/functions/v1/whatsapp-webhook`,
          })
          .select()
          .single();

        if (instanceError) {
          console.error(`❌ Attempt ${attempts} failed:`, instanceError);
          if (attempts === maxAttempts) {
            // Última tentativa - verificar se já existe no banco
            const { data: existingInDb } = await supabase
              .from('whatsapp_instances')
              .select('*')
              .eq('workspace_id', workspaceId)
              .eq('instance_name', secureInstanceName)
              .maybeSingle();
              
            if (existingInDb) {
              console.log('✅ Instance found in database after all attempts');
              instanceData = existingInDb;
            } else {
              throw new Error(`Failed to save instance after ${maxAttempts} attempts: ${instanceError.message}`);
            }
          } else {
            // Aguardar antes da próxima tentativa
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } else {
          instanceData = insertResult;
          console.log(`✅ Instance saved to Supabase on attempt ${attempts}:`, JSON.stringify(instanceData, null, 2));
        }
      } catch (error) {
        console.error(`❌ Exception on attempt ${attempts}:`, error);
        if (attempts === maxAttempts) {
          throw error;
        }
      }
    }
    
    const responseData = { 
      success: true,
      data, 
      instanceData, 
      status: instanceData?.status || 'close',
      message: 'Instance created successfully'
    };
    
    console.log('✅ Returning success response:', JSON.stringify(responseData, null, 2));
    
    return new Response(JSON.stringify(responseData), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error('❌ Error creating instance:', error);
    console.error('❌ Error name:', error?.name);
    console.error('❌ Error message:', error?.message);
    console.error('❌ Error stack:', error?.stack);
    
    const errorResponse = { 
      success: false,
      error: error?.message || 'Unknown error occurred',
      instanceName,
      workspaceId,
      timestamp: new Date().toISOString()
    };
    
    console.log('❌ Returning error response:', JSON.stringify(errorResponse, null, 2));
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function getQRCode(instanceName: string, workspaceId: string, supabase: any, apiUrl: string, apiKey: string) {
  try {
    console.log(`🔄 Getting QR code for instance ${instanceName} in workspace ${workspaceId}`);
    console.log(`🔧 Using API URL: ${apiUrl}, has API key: ${!!apiKey}`);

    // Try to get QR code directly - try different endpoints
    let response;
    let qrEndpoint = `${apiUrl}/instance/connect/${instanceName}`;
    
    console.log(`🔍 Trying QR endpoint: ${qrEndpoint}`);
    response = await fetch(qrEndpoint, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
      },
    });

    console.log(`📨 QR connect response status: ${response.status}`);

    // If first endpoint fails, try alternative
    if (!response.ok) {
      qrEndpoint = `${apiUrl}/instance/qr/${instanceName}`;
      console.log(`🔍 Trying alternative QR endpoint: ${qrEndpoint}`);
      
      response = await fetch(qrEndpoint, {
        method: 'GET',
        headers: {
          'apikey': apiKey,
        },
      });
      console.log(`📨 QR alternative response status: ${response.status}`);
    }

    // If both endpoints fail, try the fetchInstances endpoint to see what's available
    if (!response.ok) {
      console.log(`🔍 Trying fetchInstances endpoint to check available instances`);
      
      const instancesResponse = await fetch(`${apiUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'apikey': apiKey,
        },
      });
      
      console.log(`📨 fetchInstances response status: ${instancesResponse.status}`);
      
      if (instancesResponse.ok) {
        const instancesData = await instancesResponse.json();
        console.log(`📋 Available instances:`, instancesData);
        
        // Check if our instance exists
        const instanceExists = instancesData.some((inst: any) => 
          inst.instance?.instanceName === instanceName || 
          inst.instanceName === instanceName
        );
        
        if (!instanceExists) {
          throw new Error(`Instance ${instanceName} not found in Evolution API. Please create the instance first.`);
        }
        
        // If instance exists but QR endpoints failed, it might be already connected
        return new Response(JSON.stringify({ 
          connected: true,
          status: 'connected',
          message: 'Instance appears to be already connected or QR code is not needed'
        }), { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
      
      // If all fails, return error
      const errorText = await response.text().catch(() => '');
      console.error(`❌ Failed to get QR code from all endpoints:`, {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      
      throw new Error(`Failed to get QR code: ${response.status} - ${errorText || 'Instance may not exist or already be connected'}`);
    }

    const data = await response.json();
    console.log(`✅ QR code received for instance ${instanceName}:`, {
      hasQrCode: !!(data.qrcode?.base64 || data.base64 || data.qr),
      hasUrl: !!data.url,
      dataKeys: Object.keys(data)
    });

    // Extract QR code from different possible formats
    let qrCodeBase64 = null;
    if (data.qrcode?.base64) {
      qrCodeBase64 = data.qrcode.base64;
    } else if (data.base64) {
      qrCodeBase64 = data.base64;
    } else if (data.qr) {
      qrCodeBase64 = data.qr;
    } else if (data.code) {
      qrCodeBase64 = data.code;
    }

    console.log(`🎯 Extracted QR code base64: ${!!qrCodeBase64}`);

    if (!qrCodeBase64) {
      console.log(`⚠️ No QR code found in response, instance might be connected`);
      return new Response(JSON.stringify({
        connected: true,
        status: 'connected', 
        message: 'No QR code available - instance may already be connected'
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Update instance status and QR code in Supabase
    const { error: updateError } = await supabase
      .from('whatsapp_instances')
      .update({ 
        status: 'connecting',
        qr_code: qrCodeBase64,
        updated_at: new Date().toISOString()
      })
      .eq('instance_name', instanceName)
      .eq('workspace_id', workspaceId);

    if (updateError) {
      console.error('❌ Error updating instance in Supabase:', updateError);
    } else {
      console.log('✅ Instance updated in Supabase with QR code');
    }

    const responseData = {
      success: true,
      qr_code: qrCodeBase64,
      ...data,
      message: 'QR code generated successfully'
    };

    console.log('✅ Returning QR code response');

    return new Response(JSON.stringify(responseData), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error('❌ Error getting QR code:', error);
    console.error('❌ Error name:', error?.name);
    console.error('❌ Error message:', error?.message);
    console.error('❌ Error stack:', error?.stack);
    
    const errorResponse = { 
      success: false,
      error: error?.message || 'Unknown error occurred',
      instanceName,
      workspaceId,
      timestamp: new Date().toISOString()
    };
    
    console.log('❌ Returning QR code error response:', JSON.stringify(errorResponse, null, 2));
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function getInstanceStatus(instanceName: string, supabase: any, apiUrl: string, apiKey: string) {
  try {
    console.log(`Getting status for instance ${instanceName}`);

    const response = await fetch(`${apiUrl}/instance/status/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to get instance status: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log(`Status for instance ${instanceName}:`, data);

    // Update instance status in Supabase
    await supabase
      .from('whatsapp_instances')
      .update({ status: data.status })
      .eq('instance_name', instanceName);

    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error getting instance status:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function checkWhatsApp(phone: string, workspaceId: string, supabase: any, apiUrl: string, apiKey: string) {
  try {
    // Normalizar telefone para garantir DDI 55 para números brasileiros
    const normalizedPhone = ensureCountryCode55(phone);
    
    console.log(`🔍 Checking WhatsApp for ${normalizedPhone}`);

    // Buscar uma instância aberta do workspace
    const { data: instanceData, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('instance_name')
      .eq('workspace_id', workspaceId)
      .eq('status', 'open')
      .limit(1)
      .single();

    if (instanceError || !instanceData) {
      console.log('⚠️ No open instance found for workspace');
      return new Response(
        JSON.stringify({ 
          hasWhatsApp: false,
          error: 'Nenhuma instância conectada encontrada'
        }), 
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const instanceName = instanceData.instance_name;
    console.log(`📱 Using instance ${instanceName} to check WhatsApp`);

    // Chamar Evolution API para verificar se o número tem WhatsApp
    const response = await fetch(`${apiUrl}/chat/whatsappNumbers/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        numbers: [normalizedPhone]
      }),
    });

    if (!response.ok) {
      console.error(`❌ Failed to check WhatsApp: ${response.status}`);
      return new Response(
        JSON.stringify({ hasWhatsApp: false }), 
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    console.log('✅ WhatsApp check result:', data);

    // Evolution API retorna um array com os números que têm WhatsApp
    const hasWhatsApp = data && Array.isArray(data) && data.length > 0;

    return new Response(
      JSON.stringify({ hasWhatsApp }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('❌ Error checking WhatsApp:', error);
    return new Response(
      JSON.stringify({ hasWhatsApp: false }), 
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function sendMessage(instanceName: string, phone: string, message: string, supabase: any, apiUrl: string, apiKey: string, workspaceId: string, credentialsSource: string = 'defaults') {
  try {
    // Normalizar telefone para garantir DDI 55 para números brasileiros
    const normalizedPhone = ensureCountryCode55(phone);
    
    console.log(`📤 Sending message to ${normalizedPhone} via instance ${instanceName}`);
    console.log(`🔧 Using credentials from: ${credentialsSource}`);
    console.log(`🌐 API URL: ${apiUrl}`);
    console.log(`🔑 Has API Key: ${!!apiKey}`);

    const response = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        number: normalizedPhone,
        text: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData = {};
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      console.error(`❌ Failed to send message:`, {
        status: response.status,
        statusText: response.statusText,
        phone: normalizedPhone,
        instanceName,
        credentialsSource,
        errorData,
        errorText
      });
      
      // Detectar erros específicos
      const errorMsg = errorText.toLowerCase();
      if (errorMsg.includes('not registered') || 
          errorMsg.includes('not found') ||
          errorMsg.includes('jid not found') ||
          errorMsg.includes('número não cadastrado')) {
        throw new Error('WhatsApp não cadastrado neste número');
      }
      
      if (errorMsg.includes('invalid number') || 
          errorMsg.includes('número inválido')) {
        throw new Error('Número de telefone inválido');
      }
      
      throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ Message sent successfully to ${normalizedPhone} via ${instanceName} (credentials: ${credentialsSource}):`, data);

    // Save message to Supabase
    try {
      // Buscar ou criar conversa usando workspace_id se fornecido
      let conversationQuery = supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('phone_number', normalizedPhone);
      
      if (workspaceId) {
        conversationQuery = conversationQuery.eq('workspace_id', workspaceId);
      }
      
      const { data: conversation, error: convError } = await conversationQuery.maybeSingle();

      let conversationId = conversation?.id;

      if (!conversation && workspaceId) {
        // Criar nova conversa se não existir
        const { data: newConv, error: createError } = await supabase
          .from('whatsapp_conversations')
          .insert({
            phone_number: normalizedPhone,
            instance_id: null, // Evolution API não usa instance_id do banco
            workspace_id: workspaceId,
            last_message_at: new Date().toISOString(),
            is_read: true,
            message_count: 1
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating conversation:', createError);
        } else {
          conversationId = newConv.id;
          console.log('Created new conversation:', newConv);
        }
      }

      if (conversationId) {
        // Salvar mensagem enviada
        const { error: msgError } = await supabase
          .from('whatsapp_messages')
          .insert({
            conversation_id: conversationId,
            message_id: data.key?.id || data.id || `sent_${Date.now()}`,
            is_from_lead: false,
            message_text: message,
            message_type: 'text',
            timestamp: new Date().toISOString(),
            status: 'sent'
          });

        if (msgError) {
          console.error('Error saving sent message:', msgError);
        } else {
          console.log('Sent message saved to database');
          
          // Atualizar última mensagem da conversa
          await supabase
            .from('whatsapp_conversations')
            .update({
              last_message_at: new Date().toISOString(),
              message_count: conversation ? (conversation.message_count || 0) + 1 : 1
            })
            .eq('id', conversationId);
        }
      }
    } catch (dbError) {
      console.error('Database error while saving sent message:', dbError);
      // Não falhar o envio por erro de banco
    }

    return new Response(JSON.stringify({ success: true, messageId: data.key?.id || data.id, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Send media message via Evolution API based on official documentation
 * https://doc.evolution-api.com/v1/api-reference/message-controller/send-media
 */
async function sendImage(instanceName: string, phone: string, imageUrl: string, caption: string, supabase: any, apiUrl: string, apiKey: string, workspaceId: string) {
  try {
    const normalizedPhone = ensureCountryCode55(phone);
    console.log(`📷 Sending image to ${normalizedPhone} via instance ${instanceName}`);
    
    if (!normalizedPhone) {
      throw new Error('Número inválido');
    }

    // PASSO 1: Baixar imagem da URL (Supabase Storage)
    console.log('📥 Downloading image from URL:', imageUrl);
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }

    // PASSO 2: Converter para base64 sem usar spread para evitar stack overflow
    const imageBuffer = await imageResponse.arrayBuffer();
    const uint8Array = new Uint8Array(imageBuffer);
    let binaryString = '';
    
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    
    const base64Image = btoa(binaryString);
    console.log(`✅ Image converted to base64 (${imageBuffer.byteLength} bytes)`);

    // PASSO 3: Detectar mimetype a partir da extensão
    const extension = imageUrl.split('.').pop()?.toLowerCase() || 'jpeg';
    const mimetypeMap: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };
    const mimetype = mimetypeMap[extension] || 'image/jpeg';

    // PASSO 4: Enviar no formato FLAT correto
    console.log('📤 Sending image to Evolution API with flat format...');
    const response = await fetch(`${apiUrl}/message/sendMedia/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        number: normalizedPhone,
        mediatype: 'image',
        mimetype: mimetype,
        media: base64Image,
        fileName: `image.${extension}`,
        caption: caption || ''
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      throw new Error(`Failed to send image: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Image sent successfully:', data);

    // Save message to Supabase for conversation tracking
    try {
      // Find or create conversation
      let conversationQuery = supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('phone_number', normalizedPhone);
      
      if (workspaceId) {
        conversationQuery = conversationQuery.eq('workspace_id', workspaceId);
      }
      
      const { data: conversation, error: convError } = await conversationQuery.maybeSingle();

      let conversationId = conversation?.id;

      if (!conversation && workspaceId) {
        // Create new conversation if it doesn't exist
        const { data: newConv, error: createError } = await supabase
          .from('whatsapp_conversations')
          .insert({
            phone_number: normalizedPhone,
            instance_id: null,
            workspace_id: workspaceId,
            last_message_at: new Date().toISOString(),
            is_read: true,
            message_count: 1
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating conversation:', createError);
        } else {
          conversationId = newConv.id;
          console.log('Created new conversation:', newConv);
        }
      }

      if (conversationId) {
        // Save sent message
        const { error: msgError } = await supabase
          .from('whatsapp_messages')
          .insert({
            conversation_id: conversationId,
            message_id: data.key?.id || `image_${Date.now()}`,
            is_from_lead: false,
            sent_by: null,
            message_text: caption || 'Imagem',
            message_type: 'image',
            media_url: imageUrl,
            media_type: 'image',
            attachment_name: 'image.jpg',
            timestamp: new Date().toISOString(),
            status: 'sent'
          });

        if (msgError) {
          console.error('Error saving sent image message:', msgError);
        } else {
          console.log('✅ Sent image message saved to database');
          
          // Update conversation last message
          await supabase
            .from('whatsapp_conversations')
            .update({
              last_message_at: new Date().toISOString(),
              message_count: conversation ? (conversation.message_count || 0) + 1 : 1
            })
            .eq('id', conversationId);
        }
      }
    } catch (dbError) {
      console.error('Database error while saving sent image message:', dbError);
      // Don't fail the send due to DB error
    }

    return new Response(JSON.stringify({ success: true, messageId: data.key?.id || data.id, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Error sending image:', error);
    
    // Extract full error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Send audio message via Evolution API based on official documentation
 * https://doc.evolution-api.com/v1/api-reference/message-controller/send-audio
 */
async function sendAudio(instanceName: string, number: string, audioBase64: string, supabase: any, apiUrl: string, apiKey: string, workspaceId?: string) {
  console.log('🎵 SendAudio function called (official Evolution API):', { 
    instanceName, 
    number, 
    audioBase64: audioBase64?.substring(0, 50) + '...', 
    workspaceId, 
    apiUrl, 
    hasKey: !!apiKey 
  });

  if (!apiKey) {
    throw new Error('API Key é obrigatória para Evolution API');
  }

  // Clean and validate audio data
  let cleanBase64 = audioBase64;
  
  // Remove data URI prefix if present
  if (audioBase64?.startsWith('data:')) {
    cleanBase64 = audioBase64.split(',')[1];
  }

  if (!cleanBase64) {
    throw new Error('Base64 de áudio inválido');
  }

  // Format phone number
  const normalizedPhone = ensureCountryCode55(number);
  if (!normalizedPhone) {
    throw new Error('Número inválido');
  }

  console.log('🎵 Sending audio via official Evolution API:', {
    instanceName,
    number: normalizedPhone,
    base64Length: cleanBase64.length,
    endpoint: `${apiUrl}/message/sendWhatsAppAudio/${instanceName}`,
    hasApiKey: !!apiKey
  });

  try {
    // First, upload audio to Supabase Storage
    let audioStorageUrl = null;
    
    if (workspaceId && cleanBase64) {
      try {
        console.log('📁 Uploading audio to Supabase Storage...');
        const audioBuffer = Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0));
        const timestamp = Date.now();
        const fileName = `audio/sent_${timestamp}_${instanceName}.ogg`;
        const filePath = `${workspaceId}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('whatsapp-media')
          .upload(filePath, audioBuffer, {
            contentType: 'audio/ogg',
            cacheControl: '3600'
          });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('whatsapp-media')
            .getPublicUrl(filePath);
          
          audioStorageUrl = urlData.publicUrl;
          console.log('✅ Audio uploaded to Supabase Storage:', audioStorageUrl);
        } else {
          console.error('❌ Audio upload error:', uploadError);
        }
      } catch (storageError) {
        console.error('❌ Audio storage error:', storageError);
      }
    }

    // Prepare request body according to Evolution API documentation
    const requestBody = {
      number: normalizedPhone,
      audio: cleanBase64,
      delay: 1200,
      quoted: {
        message: {
          conversation: ""
        }
      }
    };

    console.log('📤 Evolution API Request:', {
      endpoint: `${apiUrl}/message/sendWhatsAppAudio/${instanceName}`,
      requestBodyKeys: Object.keys(requestBody),
      number: requestBody.number,
      audioLength: requestBody.audio?.length,
      delay: requestBody.delay
    });

    // Send audio using official Evolution API format
    const response = await fetch(`${apiUrl}/message/sendWhatsAppAudio/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      throw new Error(`Erro na API Evolution: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log('✅ Audio sent successfully via Evolution API:', responseData);

    // Save message to database for conversation tracking
    if (workspaceId) {
      try {
        // Find conversation
        const { data: conversation } = await supabase
          .from('whatsapp_conversations')
          .select('id, message_count')
          .eq('workspace_id', workspaceId)
          .eq('phone_number', normalizedPhone)
          .single();

        if (conversation?.id) {
          // Save sent message
          await supabase
            .from('whatsapp_messages')
            .insert({
              conversation_id: conversation.id,
              message_text: '[audio enviado]',
              message_type: 'audio',
              media_type: 'audio/ogg',
              is_from_lead: false,
              sent_by: null,
              message_id: responseData.key?.id || `audio_${Date.now()}`,
              status: 'sent',
              timestamp: new Date().toISOString(),
              media_url: audioStorageUrl || null,
              permanent_audio_url: audioStorageUrl || null
            });

          // Update conversation
          await supabase
            .from('whatsapp_conversations')
            .update({
              last_message_at: new Date().toISOString(),
              message_count: (conversation.message_count || 0) + 1
            })
            .eq('id', conversation.id);

          console.log('✅ Audio message saved to database');
        }
      } catch (dbError) {
        console.error('❌ Database error:', dbError);
      }
    }

    return responseData;
  } catch (error) {
    console.error('❌ Error sending audio:', error);
    throw error;
  }
}

async function configureWebhook(instanceName: string, workspaceId: string, supabase: any, apiUrl: string, apiKey: string) {
  try {
    console.log(`🔧 Configurando webhook para instância ${instanceName} com processamento automático de mídia`);

    // Configure webhook to automatically process media and include base64
    const webhookResponse = await fetch(`${apiUrl}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify({
        url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-webhook`,
        enabled: true,
        events: [
          'APPLICATION_STARTUP',
          'QRCODE_UPDATED', 
          'CONNECTION_UPDATE',
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'SEND_MESSAGE'
        ],
        webhook_by_events: false,
        webhook_base64: true, // Force base64 processing
        webhook_filter: {
          isGroup: false // Only private messages
        }
      })
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('❌ Webhook configuration failed:', errorText);
      throw new Error(`Webhook configuration failed: ${webhookResponse.status} - ${errorText}`);
    }

    console.log('✅ Webhook configurado com processamento automático de mídia');

    // Also configure message settings to process media automatically
    try {
      const settingsResponse = await fetch(`${apiUrl}/settings/set/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey
        },
        body: JSON.stringify({
          reject_call: false,
          msg_call: '',
          groups_ignore: true,
          always_online: false,
          read_messages: false,
          read_status: false,
          sync_full_history: false,
          webhook_base64: true, // Force media processing
          auto_download_media: true // Automatically download and process media
        })
      });

      if (settingsResponse.ok) {
        console.log('✅ Configurações de processamento automático ativadas');
      } else {
        console.warn('⚠️ Falha ao configurar processamento automático (não crítico)');
      }
    } catch (settingsError) {
      console.warn('⚠️ Erro ao configurar settings (não crítico):', settingsError);
    }

    const response = await fetch(`${apiUrl}/webhook/instance/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        url: `${supabaseUrl}/functions/v1/whatsapp-webhook`,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
        webhook_base64: true
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Erro ao configurar webhook: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log(`✅ Webhook configurado com sucesso para ${instanceName}:`, data);
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Erro ao configurar webhook:', error);
    throw error;
  }
}

async function testWebhook(instanceName: string, workspaceId: string, supabase: any, apiUrl: string, apiKey: string) {
  try {
    console.log(`✉️  Testando webhook para instância ${instanceName}`);

    const response = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        number: '5511999999999', // Número fixo para teste
        text: 'Teste de webhook!'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Erro ao testar webhook: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log(`✅ Teste de webhook enviado com sucesso para ${instanceName}:`, data);
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Erro ao testar webhook:', error);
    throw error;
  }
}

async function verifyInstance(instanceName: string, supabase: any, apiUrl: string, apiKey: string) {
  try {
    console.log(`Verificando instância ${instanceName}`);

    const response = await fetch(`${apiUrl}/instance/check/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Erro ao verificar instância: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log(`Status da instância ${instanceName}:`, data);

    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Erro ao verificar instância:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function listInstances(workspaceId: string, supabase: any, apiUrl: string, apiKey: string) {
  try {
    console.log(`🔍 Listando e sincronizando instâncias para workspace ${workspaceId}`);
    
    // Security: Generate workspace prefix for isolation
    const workspacePrefix = `ws_${workspaceId.substring(0, 8)}_`;
    console.log(`🔒 Using workspace prefix: ${workspacePrefix}`);
    
    // Arrays para tracking de mudanças
    const syncResults = {
      created: [] as string[],
      updated: [] as string[],
      removed: [] as string[],
      errors: [] as string[],
      orphansDetected: [] as string[]
    };

    // Buscar instâncias do Evolution API
    let evolutionInstances = [];
    try {
      const evolutionResponse = await fetch(`${apiUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'apikey': apiKey
        }
      });

      if (evolutionResponse.ok) {
        const allEvolutionInstances = await evolutionResponse.json();
        // SECURITY: Filter only instances belonging to this workspace
        evolutionInstances = allEvolutionInstances.filter((instance: any) => {
          const instanceName = instance.name || instance.instance?.instanceName || instance.instanceName;
          const belongsToWorkspace = instanceName && instanceName.startsWith(workspacePrefix);
          
          if (instanceName && !belongsToWorkspace) {
            console.log(`🔒 Security: Filtering out instance ${instanceName} (doesn't belong to workspace ${workspaceId})`);
          }
          
          return belongsToWorkspace;
        });
        
        console.log(`📋 Found ${allEvolutionInstances.length} total instances, ${evolutionInstances.length} belong to workspace ${workspaceId}`);
      } else {
        console.warn(`⚠️ Could not fetch from Evolution API: ${evolutionResponse.status}`);
        syncResults.errors.push(`Evolution API error: ${evolutionResponse.status}`);
      }
    } catch (evolutionError) {
      console.warn('⚠️ Evolution API not accessible:', evolutionError);
      syncResults.errors.push(`Evolution API connection failed: ${evolutionError.message}`);
    }

    // Buscar instâncias do Supabase (já filtradas por workspace_id na RLS)
    const { data: localInstances, error: dbError } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (dbError) {
      console.error('❌ Erro ao buscar instâncias do Supabase:', dbError);
      throw new Error('Erro ao buscar instâncias do Supabase');
    }

    console.log(`💾 Found ${localInstances?.length || 0} instances in local database for workspace ${workspaceId}`);
    
    // SECURITY: Validate that all local instances have the correct prefix
    const invalidLocalInstances = (localInstances || []).filter(instance => 
      !instance.instance_name.startsWith(workspacePrefix)
    );
    
    if (invalidLocalInstances.length > 0) {
      console.warn(`🔒 Security warning: Found ${invalidLocalInstances.length} local instances without workspace prefix`);
      syncResults.errors.push(`Found ${invalidLocalInstances.length} instances without workspace prefix - manual migration may be needed`);
      
      // Mark these instances for migration
      for (const invalidInstance of invalidLocalInstances) {
        console.warn(`🔒 Invalid instance: ${invalidInstance.instance_name} (should start with ${workspacePrefix})`);
      }
    }
    
    // Se conseguimos dados da Evolution API, sincronizar
    if (evolutionInstances.length > 0) {
      console.log('🔄 Starting synchronization...');
      
      const localInstanceMap = new Map();
      (localInstances || []).forEach(instance => {
        localInstanceMap.set(instance.instance_name, instance);
      });

      // Processar instâncias da Evolution API
      for (const evolutionInstance of evolutionInstances) {
        // Diferentes estruturas de dados da Evolution API
        const instanceName = evolutionInstance.name || evolutionInstance.instance?.instanceName || evolutionInstance.instanceName;
        const instanceStatus = evolutionInstance.connectionStatus || evolutionInstance.instance?.state || evolutionInstance.state || 'close';
        const ownerJid = evolutionInstance.ownerJid;
        const profileName = evolutionInstance.profileName;
        
        if (!instanceName) continue;

        console.log(`📱 Processing Evolution instance: ${instanceName} (status: ${instanceStatus})`);
        
        const localInstance = localInstanceMap.get(instanceName);
        
        if (!localInstance) {
          // SECURITY: Only create instances that belong to this workspace
          if (!instanceName.startsWith(workspacePrefix)) {
            console.warn(`🔒 Security: Skipping instance ${instanceName} - doesn't belong to workspace ${workspaceId}`);
            syncResults.errors.push(`Security: Instance ${instanceName} doesn't belong to this workspace`);
            continue;
          }
          
          // Instância existe na Evolution mas não no banco - criar
          try {
            console.log(`➕ Creating local instance for ${instanceName}`);
            const { error: insertError } = await supabase
              .from('whatsapp_instances')
              .insert({
                instance_name: instanceName,
                instance_key: instanceName,
                workspace_id: workspaceId,
                status: instanceStatus,
                phone_number: ownerJid ? ownerJid.split('@')[0] : null,
                webhook_url: `https://mqotdnvwyjhyiqzbefpm.supabase.co/functions/v1/whatsapp-webhook`,
                last_seen: new Date().toISOString()
              });

            if (insertError) {
              console.error(`❌ Failed to create local instance ${instanceName}:`, insertError);
              syncResults.errors.push(`Failed to create ${instanceName}: ${insertError.message}`);
            } else {
              console.log(`✅ Created local instance: ${instanceName}`);
              syncResults.created.push(instanceName);
            }
          } catch (error) {
            console.error(`❌ Exception creating instance ${instanceName}:`, error);
            syncResults.errors.push(`Exception creating ${instanceName}: ${error.message}`);
          }
        } else {
          // Instância existe - verificar se precisa atualizar
          const needsUpdate = localInstance.status !== instanceStatus || 
                            localInstance.status === 'unknown' ||
                            !localInstance.phone_number && ownerJid;
          
          if (needsUpdate) {
            try {
              console.log(`🔄 Updating instance ${instanceName}: ${localInstance.status} → ${instanceStatus}`);
              const updateData: any = { 
                status: instanceStatus,
                last_seen: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              
              // Atualizar phone_number se disponível
              if (ownerJid && !localInstance.phone_number) {
                updateData.phone_number = ownerJid.split('@')[0];
              }
              
              const { error: updateError } = await supabase
                .from('whatsapp_instances')
                .update(updateData)
                .eq('id', localInstance.id);

              if (updateError) {
                console.error(`❌ Failed to update instance ${instanceName}:`, updateError);
                syncResults.errors.push(`Failed to update ${instanceName}: ${updateError.message}`);
              } else {
                console.log(`✅ Updated instance ${instanceName} successfully`);
                syncResults.updated.push(instanceName);
              }
            } catch (error) {
              console.error(`❌ Exception updating instance ${instanceName}:`, error);
              syncResults.errors.push(`Exception updating ${instanceName}: ${error.message}`);
            }
          } else {
            console.log(`⚪ Instance ${instanceName} already up to date`);
          }
        }
        
        // Remover da lista local para identificar instâncias órfãs
        localInstanceMap.delete(instanceName);
      }

      // Instâncias que sobraram no mapa local podem não existir mais na Evolution API
      // Mas só marcar como órfãs se temos certeza que conseguimos acessar a API
      if (evolutionInstances.length > 0) {
        for (const [instanceName, localInstance] of localInstanceMap) {
          console.log(`⚠️ Instance ${instanceName} exists locally but not found in Evolution API response`);
          // Apenas marcar como órfã se não foi encontrada na resposta da API
          try {
            const { error: updateError } = await supabase
              .from('whatsapp_instances')
              .update({ 
                status: 'unknown',
                updated_at: new Date().toISOString()
              })
              .eq('id', localInstance.id);

            if (!updateError) {
              syncResults.orphansDetected.push(instanceName);
              console.log(`🔄 Marked ${instanceName} as orphan (not found in API)`);
            }
          } catch (error) {
            console.error(`❌ Failed to mark ${instanceName} as unknown:`, error);
            syncResults.errors.push(`Failed to mark ${instanceName} as unknown: ${error.message}`);
          }
        }
      } else {
        console.log(`⚠️ No instances received from Evolution API - skipping orphan detection`);
      }
    }

    // Buscar instâncias atualizadas do banco após sincronização
    const { data: finalInstances } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    console.log(`✅ Sync completed. Final count: ${finalInstances?.length || 0} instances`);

    return new Response(JSON.stringify({ 
      instances: finalInstances || [], 
      syncResults 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error('❌ Erro ao listar/sincronizar instâncias:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      instances: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Send generic media via Evolution API
 */
async function sendMediaGeneric(
  instanceName: string, 
  number: string, 
  mediaBase64: string, 
  mediaType: string, 
  fileName: string, 
  supabase: any, 
  apiUrl: string, 
  apiKey: string, 
  workspaceId?: string
) {
  console.log('📎 SendMediaGeneric function called:', { 
    instanceName, 
    number, 
    mediaType,
    fileName,
    hasMediaBase64: !!mediaBase64,
    workspaceId
  });

  if (!apiKey) {
    throw new Error('API Key é obrigatória para Evolution API');
  }

  // Clean and validate media data
  let cleanBase64 = mediaBase64;
  
  // Remove data URI prefix if present
  if (mediaBase64?.startsWith('data:')) {
    cleanBase64 = mediaBase64.split(',')[1];
  }

  if (!cleanBase64) {
    throw new Error('Base64 de mídia inválido');
  }

  // Format phone number
  const normalizedPhone = ensureCountryCode55(number);
  if (!normalizedPhone) {
    throw new Error('Número inválido');
  }

  console.log('📎 Sending media via Evolution API:', {
    instanceName,
    number: normalizedPhone,
    mediaType,
    fileName,
    base64Length: cleanBase64.length
  });

  try {
    // Send media using Evolution API
    const response = await fetch(`${apiUrl}/message/sendMedia/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        number: normalizedPhone,
        options: {
          delay: 1200,
          presence: "composing"
        },
        mediaMessage: {
          mediaType: mediaType === 'image' ? 'image' : 'document',
          fileName: fileName,
          caption: '',
          media: `data:${mediaType === 'image' ? 'image/jpeg' : 'application/octet-stream'};base64,${cleanBase64}`
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      throw new Error(`Erro na API Evolution: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log('✅ Media sent successfully via Evolution API:', responseData);

    // Save message to database for conversation tracking
    if (workspaceId) {
      try {
        // Find conversation
        const { data: conversation } = await supabase
          .from('whatsapp_conversations')
          .select('id, message_count')
          .eq('workspace_id', workspaceId)
          .eq('phone_number', normalizedPhone)
          .single();

        if (conversation?.id) {
          // Save sent message
          await supabase
            .from('whatsapp_messages')
            .insert({
              conversation_id: conversation.id,
              message_text: mediaType === 'image' ? 'Imagem' : fileName,
              message_type: mediaType === 'image' ? 'image' : 'document',
              is_from_lead: false,
              sent_by: null,
              message_id: responseData.key?.id || `media_${Date.now()}`,
              status: 'sent',
              timestamp: new Date().toISOString(),
              media_url: `data:${mediaType === 'image' ? 'image/jpeg' : 'application/octet-stream'};base64,${cleanBase64}`,
              media_type: mediaType,
              attachment_name: fileName
            });

          // Update conversation
          await supabase
            .from('whatsapp_conversations')
            .update({
              last_message_at: new Date().toISOString(),
              message_count: (conversation.message_count || 0) + 1,
              is_read: false // Mark as unread since it's a new message
            })
            .eq('id', conversation.id);

          console.log('✅ Media message saved to database');
        }
      } catch (dbError) {
        console.error('❌ Database error:', dbError);
      }
    }

    return responseData;
  } catch (error) {
    console.error('❌ Error sending media:', error);
    throw error;
  }
}

async function getWebhookStatus(instanceName: string, supabase: any, apiUrl: string, apiKey: string) {
  try {
    console.log(`📊 Verificando status do webhook para instância ${instanceName}`);

    // Buscar status do webhook na API Evolution
    const response = await fetch(`${apiUrl}/webhook/find/${instanceName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      }
    });

    if (!response.ok) {
      console.log(`⚠️ Webhook não encontrado para ${instanceName} - status: ${response.status}`);
      return new Response(JSON.stringify({
        success: true,
        configured: false,
        active: false,
        error: 'Webhook não configurado'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    console.log(`✅ Status do webhook para ${instanceName}:`, data);

    const expectedUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-webhook`;
    const isCorrectUrl = data.url === expectedUrl;
    const hasMessagesUpsert = data.events?.includes('MESSAGES_UPSERT') || data.events?.includes('messages.upsert');

    return new Response(JSON.stringify({
      success: true,
      configured: true,
      active: data.enabled || false,
      url: data.url,
      expected_url: expectedUrl,
      correct_url: isCorrectUrl,
      events: data.events || [],
      webhook_base64: data.webhook_base64 || false,
      has_messages_upsert: hasMessagesUpsert,
      data
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ Erro ao verificar status do webhook:', error);
    return new Response(JSON.stringify({
      success: false,
      configured: false,
      active: false,
      error: (error as Error).message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
}

// Diagnosticar configuração do webhook de uma instância
async function diagnoseWebhook(instanceName: string, supabase: any, apiUrl: string, apiKey: string) {
  try {
    console.log(`🔍 Diagnosticando webhook para instância ${instanceName}`);

    // Buscar status do webhook na API Evolution
    const response = await fetch(`${apiUrl}/webhook/find/${instanceName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      }
    });

    const expectedUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-webhook`;
    const expectedEvents = ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'];

    if (!response.ok) {
      return new Response(JSON.stringify({
        success: true,
        instanceName,
        diagnosis: 'not_configured',
        message: 'Webhook não está configurado',
        issues: ['Webhook não configurado na Evolution API'],
        recommendations: ['Execute "Corrigir Automaticamente" para configurar o webhook'],
        needsFix: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    console.log(`📋 Configuração atual do webhook:`, data);

    // Verificar problemas
    const issues = [];
    const recommendations = [];
    
    if (data.url !== expectedUrl) {
      issues.push(`URL incorreta: ${data.url}`);
      recommendations.push(`Atualizar URL para: ${expectedUrl}`);
    }

    if (!data.enabled) {
      issues.push('Webhook está desabilitado');
      recommendations.push('Habilitar webhook');
    }

    const hasMessagesUpsert = data.events?.includes('MESSAGES_UPSERT') || data.events?.includes('messages.upsert');
    if (!hasMessagesUpsert) {
      issues.push('Evento MESSAGES_UPSERT não configurado - mensagens não serão recebidas');
      recommendations.push('Adicionar evento MESSAGES_UPSERT');
    }

    if (!data.webhook_base64) {
      issues.push('webhook_base64 desabilitado - mídias podem não funcionar corretamente');
      recommendations.push('Habilitar webhook_base64');
    }

    const diagnosis = issues.length === 0 ? 'ok' : 'needs_fix';

    return new Response(JSON.stringify({
      success: true,
      instanceName,
      diagnosis,
      message: diagnosis === 'ok' 
        ? 'Webhook configurado corretamente' 
        : `${issues.length} problema(s) encontrado(s)`,
      current_config: {
        url: data.url,
        enabled: data.enabled,
        events: data.events || [],
        webhook_base64: data.webhook_base64
      },
      expected_config: {
        url: expectedUrl,
        enabled: true,
        events: expectedEvents,
        webhook_base64: true
      },
      issues,
      recommendations,
      needsFix: issues.length > 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ Erro ao diagnosticar webhook:', error);
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
}

// Corrigir automaticamente configuração do webhook
async function fixWebhook(instanceName: string, supabase: any, apiUrl: string, apiKey: string) {
  try {
    console.log(`🔧 Corrigindo webhook para instância ${instanceName}`);

    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-webhook`;

    // Configurar webhook com todos os eventos necessários
    const response = await fetch(`${apiUrl}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify({
        url: webhookUrl,
        enabled: true,
        events: [
          'APPLICATION_STARTUP',
          'QRCODE_UPDATED', 
          'CONNECTION_UPDATE',
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'SEND_MESSAGE'
        ],
        webhook_by_events: false,
        webhook_base64: true,
        webhook_filter: {
          isGroup: false
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Falha ao configurar webhook: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ Webhook corrigido para ${instanceName}:`, result);

    // Verificar se a correção funcionou
    const verifyResponse = await fetch(`${apiUrl}/webhook/find/${instanceName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      }
    });

    let verifiedConfig = null;
    if (verifyResponse.ok) {
      verifiedConfig = await verifyResponse.json();
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Webhook corrigido com sucesso',
      instanceName,
      config: verifiedConfig,
      fixed_issues: [
        'URL atualizada',
        'Webhook habilitado',
        'Evento MESSAGES_UPSERT adicionado',
        'webhook_base64 ativado'
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ Erro ao corrigir webhook:', error);
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
}

// Diagnosticar todas as instâncias de um workspace
async function diagnoseAllInstances(workspaceId: string, supabase: any, apiUrl: string, apiKey: string) {
  try {
    console.log(`🔍 Diagnosticando todas as instâncias do workspace ${workspaceId}`);

    // Buscar todas as instâncias do workspace
    const { data: instances, error: dbError } = await supabase
      .from('whatsapp_instances')
      .select('instance_name, phone_number, status')
      .eq('workspace_id', workspaceId);

    if (dbError) {
      throw new Error(`Erro ao buscar instâncias: ${dbError.message}`);
    }

    if (!instances || instances.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Nenhuma instância encontrada',
        instances: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Diagnosticar cada instância
    const diagnostics = [];
    for (const instance of instances) {
      try {
        const diagResponse = await diagnoseWebhook(instance.instance_name, supabase, apiUrl, apiKey);
        const diagData = await diagResponse.json();
        diagnostics.push({
          ...diagData,
          phone_number: instance.phone_number,
          connection_status: instance.status
        });
      } catch (error) {
        diagnostics.push({
          success: false,
          instanceName: instance.instance_name,
          phone_number: instance.phone_number,
          error: (error as Error).message,
          needsFix: true
        });
      }
    }

    const problemInstances = diagnostics.filter(d => d.needsFix);

    return new Response(JSON.stringify({
      success: true,
      total_instances: instances.length,
      problem_instances: problemInstances.length,
      diagnostics
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ Erro ao diagnosticar instâncias:', error);
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
}

// Função para reconfigurar todas as instâncias
async function reconfigureAllInstances(workspaceId: string, supabase: any, apiUrl: string, apiKey: string) {
  try {
    console.log(`🔧 Reconfigurando todas as instâncias para workspace ${workspaceId}`);
    
    // Generate workspace prefix for security
    const workspacePrefix = `ws_${workspaceId.substring(0, 8)}_`;
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-webhook`;
    
    // 1. Buscar todas as instâncias da API Evolution
    const response = await fetch(`${apiUrl}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch instances: ${response.status}`);
    }

    const instances = await response.json();
    console.log(`📋 Encontradas ${instances.length} instâncias na API Evolution`);

    let reconfiguredCount = 0;
    const errors = [];

    // 2. Para cada instância, reconfigurar com prefixo correto e webhook
    for (const instance of instances) {
      try {
        const originalName = instance.name;
        const shouldHavePrefix = !originalName.startsWith(workspacePrefix);
        const newName = shouldHavePrefix ? `${workspacePrefix}${originalName}` : originalName;
        
        console.log(`🔄 Reconfigurando instância ${originalName} → ${newName}`);

        // Sempre configurar webhook independentemente do nome
        const webhookResponse = await fetch(`${apiUrl}/webhook/set/${originalName}`, {
          method: 'POST',
          headers: {
            'apikey': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: webhookUrl,
            events: [
              'QRCODE_UPDATED',
              'CONNECTION_UPDATE',
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE',
              'SEND_MESSAGE'
            ],
            webhook_by_events: false,
            webhook_base64: true
          }),
        });

        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text();
          console.warn(`⚠️ Webhook configuration failed for ${originalName}: ${errorText}`);
          errors.push(`Webhook para ${originalName}: ${errorText}`);
        } else {
          console.log(`🔗 Webhook configurado para ${originalName}`);
        }

        // Se o nome precisa ser alterado, renomear instância
        if (shouldHavePrefix) {
          const renameResponse = await fetch(`${apiUrl}/instance/rename`, {
            method: 'PUT',
            headers: {
              'apikey': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              oldName: originalName,
              newName: newName
            }),
          });

          if (!renameResponse.ok) {
            const errorText = await renameResponse.text();
            console.warn(`⚠️ Rename failed for ${originalName} → ${newName}: ${errorText}`);
            errors.push(`Rename ${originalName}: ${errorText}`);
          } else {
            console.log(`✏️ Instância renomeada: ${originalName} → ${newName}`);
          }
        }

        // Atualizar no banco de dados local
        const { error: dbError } = await supabase
          .from('whatsapp_instances')
          .upsert({
            workspace_id: workspaceId,
            instance_name: newName,
            instance_key: newName,
            webhook_url: webhookUrl,
            phone_number: instance.ownerJid?.replace('@s.whatsapp.net', ''),
            status: instance.connectionStatus || 'unknown',
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'instance_name,workspace_id'
          });

        if (dbError) {
          console.error(`Database error for ${newName}:`, dbError);
          errors.push(`Database para ${newName}: ${dbError.message}`);
        } else {
          console.log(`💾 Banco de dados atualizado para ${newName}`);
        }

        reconfiguredCount++;
      } catch (instanceError) {
        console.error(`Error reconfiguring instance ${instance.name}:`, instanceError);
        errors.push(`${instance.name}: ${instanceError.message}`);
      }
    }

    const result = {
      success: true,
      message: `Reconfiguração concluída. ${reconfiguredCount} instâncias processadas.`,
      reconfigured_count: reconfiguredCount,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log('✅ Reconfiguração concluída:', result);
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error reconfiguring instances:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}
