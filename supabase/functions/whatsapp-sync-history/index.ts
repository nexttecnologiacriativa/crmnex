import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper: try multiple endpoints (fallback) and return parsed JSON
async function fetchJsonWithFallback(apiUrl: string, paths: string[], headers: Record<string, string>) {
  const attempts: string[] = [];
  for (const path of paths) {
    const url = `${apiUrl}${path}`;
    try {
      console.log(`[evo] Fetching: ${url}`);
      const res = await fetch(url, { method: 'GET', headers });
      const status = `${res.status} ${res.statusText}`;
      if (!res.ok) {
        const text = await res.text().catch(() => '<no-body>');
        attempts.push(`${url} -> ${status} | ${text.slice(0, 200)}`);
        continue;
      }
      const data = await res.json().catch(async () => {
        const text = await res.text();
        throw new Error(`Invalid JSON from ${url}: ${text.slice(0, 200)}`);
      });
      return { data, usedUrl: url };
    } catch (err) {
      attempts.push(`${url} -> error: ${(err as Error).message}`);
    }
  }
  throw new Error(`All endpoints failed:\n${attempts.join('\n')}`);
}

// Helper: extract array payload from various response shapes
function extractArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.items)) return payload.items;
  if (payload && Array.isArray(payload.chats)) return payload.chats;
  if (payload && Array.isArray(payload.messages)) return payload.messages;
  return [];
}

// Helpers: base path handling and flexible fetch (supports GET/POST)
function normalizeBase(url: string) {
  return (url || '').replace(/\/+$/, '');
}

function getBasePaths(apiUrl: string) {
  const base = normalizeBase(apiUrl);
  const bases = [base, `${base}/v1`, `${base}/v2`];
  return Array.from(new Set(bases));
}

async function fetchJsonWithBasePaths(apiUrl: string, relativePath: string, init: RequestInit) {
  const attempts: string[] = [];
  for (const base of getBasePaths(apiUrl)) {
    const url = `${base}${relativePath}`;
    try {
      console.log(`[evo] Fetching: ${url}`);
      const res = await fetch(url, init);
      const status = `${res.status} ${res.statusText}`;
      if (!res.ok) {
        const text = await res.text().catch(() => '<no-body>');
        attempts.push(`${url} -> ${status} | ${text.slice(0, 200)}`);
        continue;
      }
      const data = await res.json().catch(async () => {
        const text = await res.text();
        throw new Error(`Invalid JSON from ${url}: ${text.slice(0, 200)}`);
      });
      return { data, usedUrl: url };
    } catch (err) {
      attempts.push(`${url} -> error: ${(err as Error).message}`);
    }
  }
  throw new Error(`All endpoints failed:\n${attempts.join('\n')}`);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, instanceName, workspaceId, apiKey, apiUrl, syncOptions } = await req.json();

    console.log(`Sync request: ${action} for instance ${instanceName} in workspace ${workspaceId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === 'sync_full_history') {
      return await syncFullHistory(supabase, instanceName, workspaceId, apiKey, apiUrl, syncOptions);
    } else if (action === 'sync_conversations') {
      return await syncConversations(supabase, instanceName, workspaceId, apiKey, apiUrl);
    } else if (action === 'get_sync_status') {
      return await getSyncStatus(supabase, workspaceId, instanceName);
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Sync failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function syncFullHistory(
  supabase: any, 
  instanceName: string, 
  workspaceId: string, 
  apiKey: string, 
  apiUrl: string, 
  syncOptions: any
) {
  console.log(`Starting full history sync for instance: ${instanceName}`);
  
  const {
    messageLimit = 100,
    daysBack = 30,
    includeMedia = true,
    onlyNewMessages = false
  } = syncOptions || {};

  let processedConversations = 0;
  let totalMessages = 0;
  const errors: string[] = [];

  try {
    // 1. Fetch conversations from Evolution API
const encodedInstanceName = encodeURIComponent(instanceName);
// Fetch conversations using documented endpoint and try base path variants
const { data: convRaw, usedUrl: convUrl } = await fetchJsonWithBasePaths(
  apiUrl,
  `/chat/findChats/${encodedInstanceName}`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey
    },
    body: JSON.stringify({ limit: 200 })
  }
);
const conversationsData = extractArray(convRaw);
console.log(`Conversations fetched from ${convUrl} -> ${conversationsData.length}`);

    if (!conversationsData || conversationsData.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No conversations found',
          summary: { processed_conversations: 0, total_messages: 0 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Process each conversation
    for (const conversation of conversationsData) {
      try {
        const phoneNumber = conversation.id?.replace('@s.whatsapp.net', '') || conversation.remoteJid?.replace('@s.whatsapp.net', '');
        
        if (!phoneNumber) {
          console.log('Skipping conversation without phone number');
          continue;
        }

        console.log(`Processing conversation: ${phoneNumber}`);

        // Check if conversation exists in our database
        const { data: existingConv } = await supabase
          .from('whatsapp_conversations')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('phone_number', phoneNumber)
          .maybeSingle();

        let conversationId = existingConv?.id;

        // Create conversation if it doesn't exist
        if (!conversationId) {
          const { data: newConv, error: convError } = await supabase
            .from('whatsapp_conversations')
            .insert({
              workspace_id: workspaceId,
              phone_number: phoneNumber,
              contact_name: conversation.name || phoneNumber,
              is_read: true,
              created_at: new Date().toISOString(),
              last_message_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (convError) {
            console.error(`Error creating conversation for ${phoneNumber}:`, convError);
            errors.push(`Failed to create conversation for ${phoneNumber}: ${convError.message}`);
            continue;
          }

          conversationId = newConv.id;
          console.log(`Created conversation ${conversationId} for ${phoneNumber}`);
        }

        // 3. Fetch messages for this conversation with multiple remoteJid formats
        console.log(`Fetching messages for conversation: ${phoneNumber}`);
        
        // Try different remoteJid formats
        const remoteJidFormats = [
          conversation.id || conversation.remoteJid,
          `${phoneNumber}@s.whatsapp.net`,
          `${phoneNumber}@c.us`,
          phoneNumber
        ].filter(Boolean);

        let messagesData: any[] = [];
        let successfulFormat = '';

        for (const remoteJid of remoteJidFormats) {
          if (messagesData.length > 0) break;
          
          try {
            console.log(`Trying remoteJid format: ${remoteJid}`);
            
            // Try multiple endpoints for messages
            const messageEndpoints = [
              `/chat/findMessages/${encodedInstanceName}`,
              `/message/findMessages/${encodedInstanceName}`,
              `/instance/${encodedInstanceName}/messages`
            ];

            for (const endpoint of messageEndpoints) {
              if (messagesData.length > 0) break;
              
              try {
                const { data: msgRaw, usedUrl: msgUrl } = await fetchJsonWithBasePaths(
                  apiUrl,
                  endpoint,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'apikey': apiKey
                    },
                    body: JSON.stringify({
                      where: {
                        key: {
                          remoteJid
                        }
                      },
                      limit: messageLimit,
                      includeHistory: true,
                      offset: 0
                    })
                  }
                );
                
                const currentMessages = extractArray(msgRaw);
                console.log(`Endpoint ${endpoint} with remoteJid ${remoteJid} -> ${currentMessages.length} messages`);
                
                if (currentMessages.length > 0) {
                  messagesData = currentMessages;
                  successfulFormat = remoteJid;
                  console.log(`✅ Successfully fetched ${messagesData.length} messages using ${remoteJid} from ${msgUrl}`);
                  break;
                }
              } catch (endpointError) {
                console.log(`Endpoint ${endpoint} failed:`, endpointError.message);
              }
            }
          } catch (formatError) {
            console.log(`RemoteJid format ${remoteJid} failed:`, formatError.message);
          }
        }

        console.log(`Final result: ${messagesData.length} messages for ${phoneNumber} using format: ${successfulFormat}`);

        if (messagesData && messagesData.length > 0) {
          // Process messages
          for (const message of messagesData) {
            try {
              const messageTimestamp = new Date(message.messageTimestamp * 1000);
              
              // Skip old messages if daysBack is specified
              if (daysBack > 0) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - daysBack);
                if (messageTimestamp < cutoffDate) {
                  continue;
                }
              }

              // Extract message content and media
              let messageText = '';
              let messageType = 'text';
              let mediaUrl: string | null = null;
              let mediaBase64 = '';

              if (message.message?.conversation) {
                messageText = message.message.conversation;
              } else if (message.message?.extendedTextMessage?.text) {
                messageText = message.message.extendedTextMessage.text;
              } else if (message.message?.imageMessage) {
                messageType = 'image';
                messageText = message.message.imageMessage.caption || '[Imagem]';
                mediaUrl = message.message.imageMessage.url || null;
                mediaBase64 = message.message.imageMessage.base64 || '';
              } else if (message.message?.audioMessage) {
                messageType = 'audio';
                messageText = '[Áudio]';
                mediaUrl = message.message.audioMessage.url || null;
                mediaBase64 = message.message.audioMessage.base64 || '';
              } else if (message.message?.documentMessage) {
                messageType = 'document';
                messageText = `[Documento: ${message.message.documentMessage.fileName || 'arquivo'}]`;
                mediaUrl = message.message.documentMessage.url || null;
                mediaBase64 = message.message.documentMessage.base64 || '';
              }

              // Handle audio messages specially
              let permanentAudioUrl: string | null = null;
              if (messageType === 'audio') {
                if (mediaBase64) {
                  // Upload Base64 audio directly to Supabase Storage
                  try {
                    console.log('🎵 Uploading audio with base64 to Storage...');
                    
                    const audioFileName = `${Date.now()}_${message.key?.id || 'unknown'}.ogg`;
                    const audioPath = `${workspaceId}/audio/${audioFileName}`;
                    
                    // Convert base64 to buffer
                    const cleanB64 = mediaBase64.includes(',') ? mediaBase64.split(',')[1] : mediaBase64;
                    const audioBuffer = Uint8Array.from(atob(cleanB64), c => c.charCodeAt(0));
                    
                    const { data: uploadData, error: uploadError } = await supabase.storage
                      .from('whatsapp-audio')
                      .upload(audioPath, audioBuffer, {
                        contentType: 'audio/ogg',
                        cacheControl: '3600'
                      });
                    
                    if (!uploadError && uploadData) {
                      const { data: urlData } = supabase.storage
                        .from('whatsapp-audio')
                        .getPublicUrl(audioPath);
                      
                      permanentAudioUrl = urlData.publicUrl;
                      console.log('✅ Audio uploaded to Storage:', permanentAudioUrl);
                    }
                  } catch (uploadError) {
                    console.error('❌ Error uploading audio:', uploadError);
                  }
                } else if (mediaUrl) {
                  // For remote URLs, trigger audio processor to download and convert
                  console.log('🎵 Will trigger audio processor for remote URL after message save...');
                }
                }

              // Insert message into database (with media references when available)
              const { data: insertedMsg, error: msgError } = await supabase
                .from('whatsapp_messages')
                .insert({
                  conversation_id: conversationId,
                  message_id: message.key?.id,
                  message_text: messageText,
                  message_type: messageType,
                  is_from_lead: !message.key?.fromMe,
                  media_url: mediaUrl,
                  permanent_audio_url: permanentAudioUrl,
                  timestamp: messageTimestamp.toISOString()
                })
                .select('id, message_id')
                .single();

              if (msgError) {
                console.error('Error inserting message:', msgError);
                errors.push(`Failed to insert message: ${msgError.message}`);
              } else {
                totalMessages++;
                // If it's audio with remote URL (no Base64), trigger processor to create permanent URL
                if (messageType === 'audio' && !mediaBase64 && mediaUrl && insertedMsg?.message_id) {
                  try {
                    console.log('🎵 Sync triggering audio processor for message:', insertedMsg.message_id);
                    const { error: procErr } = await supabase.functions.invoke('whatsapp-audio-processor', {
                      body: { messageId: insertedMsg.message_id }
                    });
                    if (procErr) console.log('⚠️ Audio processor invoke error:', procErr.message);
                  } catch (invErr) {
                    console.log('⚠️ Audio processor invoke exception:', (invErr as Error).message);
                  }
                }
              }

            } catch (msgError) {
              console.error('Error processing message:', msgError);
              errors.push(`Error processing message: ${msgError.message}`);
            }
          }
        }

        processedConversations++;

      } catch (convError) {
        console.error('Error processing conversation:', convError);
        errors.push(`Error processing conversation: ${convError.message}`);
      }
    }

    // 4. Save sync status
    const { error: statusError } = await supabase
      .from('whatsapp_sync_status')
      .upsert({
        workspace_id: workspaceId,
        instance_name: instanceName,
        last_sync_at: new Date().toISOString(),
        total_conversations: conversationsData.length,
        processed_conversations: processedConversations,
        total_messages: totalMessages,
        sync_options: syncOptions,
        errors: errors
      });

    if (statusError) {
      console.error('Error saving sync status:', statusError);
    }

    console.log(`Sync completed: ${processedConversations} conversations, ${totalMessages} messages`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          processed_conversations: processedConversations,
          total_messages: totalMessages,
          errors: errors
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  }
}

async function syncConversations(
  supabase: any,
  instanceName: string,
  workspaceId: string,
  apiKey: string,
  apiUrl: string
) {
  console.log(`Syncing conversations only for instance: ${instanceName}`);
  
  try {
const encodedInstanceName = encodeURIComponent(instanceName);
const { data: convRaw, usedUrl: convUrl } = await fetchJsonWithBasePaths(
  apiUrl,
  `/chat/findChats/${encodedInstanceName}`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey
    },
    body: JSON.stringify({ limit: 200 })
  }
);
console.log(`Conversations fetched from ${convUrl}`);
const conversationsData = extractArray(convRaw);
    let created = 0;
    let updated = 0;

    for (const conversation of conversationsData) {
      const phoneNumber = conversation.id?.replace('@s.whatsapp.net', '') || conversation.remoteJid?.replace('@s.whatsapp.net', '');
      
      if (!phoneNumber) continue;

      const { data: existing } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('phone_number', phoneNumber)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('whatsapp_conversations')
          .update({
            contact_name: conversation.name || phoneNumber,
            last_message_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        updated++;
      } else {
        await supabase
          .from('whatsapp_conversations')
          .insert({
            workspace_id: workspaceId,
            phone_number: phoneNumber,
            contact_name: conversation.name || phoneNumber,
            is_read: true,
            created_at: new Date().toISOString(),
            last_message_at: new Date().toISOString()
          });
        created++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, created, updated }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Conversations sync failed:', error);
    throw error;
  }
}

async function getSyncStatus(supabase: any, workspaceId: string, instanceName: string) {
  try {
let query = supabase
  .from('whatsapp_sync_status')
  .select('*')
  .eq('workspace_id', workspaceId);

if (instanceName && instanceName !== 'all') {
  query = query.eq('instance_name', instanceName);
}

const { data, error } = await query
  .order('last_sync_at', { ascending: false })
  .limit(1)
  .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return new Response(
      JSON.stringify({ sync_status: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Failed to get sync status:', error);
    throw error;
  }
}