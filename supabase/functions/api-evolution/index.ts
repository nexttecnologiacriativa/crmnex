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

    // Extract text content from different message types
    let text = '';
    if (messageData.message) {
      if (messageData.message.conversation) {
        text = messageData.message.conversation;
      } else if (messageData.message.extendedTextMessage?.text) {
        text = messageData.message.extendedTextMessage.text;
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

    // Save message to Supabase
    const { data: savedMessage, error: saveError } = await supabase
      .from('whatsapp_webhook_messages')
      .insert({
        thread_id: threadId,
        from_me: fromMe,
        push_name: pushName,
        message_type: messageType,
        text: text,
        timestamp: typeof timestamp === 'number' ? timestamp : parseInt(timestamp),
        custom_fields: customFields,
        raw: messageData
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