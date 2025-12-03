import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messageId } = await req.json();

    if (!messageId) {
      throw new Error('messageId is required');
    }

    console.log('🎤 Starting transcription for message:', messageId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch message from database
    const { data: message, error: fetchError } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (fetchError || !message) {
      console.error('❌ Error fetching message:', fetchError);
      throw new Error('Message not found');
    }

    // Check if already transcribed
    if (message.audio_transcription) {
      console.log('✅ Message already transcribed');
      return new Response(
        JSON.stringify({ text: message.audio_transcription, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get audio URL
    const audioUrl = message.permanent_audio_url || message.media_url;
    if (!audioUrl) {
      throw new Error('No audio URL available for this message');
    }

    console.log('🔗 Audio URL:', audioUrl);

    // Download audio file
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status}`);
    }

    const audioBlob = await audioResponse.blob();
    console.log('📥 Audio downloaded, size:', audioBlob.size, 'bytes');

    // Determine file extension
    let extension = 'ogg';
    if (audioUrl.includes('.mp3')) extension = 'mp3';
    else if (audioUrl.includes('.wav')) extension = 'wav';
    else if (audioUrl.includes('.m4a')) extension = 'm4a';
    else if (audioUrl.includes('.webm')) extension = 'webm';

    // Prepare form data for OpenAI
    const formData = new FormData();
    formData.append('file', audioBlob, `audio.${extension}`);
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt'); // Portuguese

    // Send to OpenAI Whisper
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    console.log('🚀 Sending to OpenAI Whisper...');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('❌ OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${whisperResponse.status} - ${errorText}`);
    }

    const result = await whisperResponse.json();
    const transcription = result.text;

    console.log('✅ Transcription received:', transcription.substring(0, 100) + '...');

    // Save transcription to database
    const { error: updateError } = await supabase
      .from('whatsapp_messages')
      .update({ audio_transcription: transcription })
      .eq('id', messageId);

    if (updateError) {
      console.error('⚠️ Error saving transcription:', updateError);
      // Continue anyway, return the transcription
    } else {
      console.log('💾 Transcription saved to database');
    }

    return new Response(
      JSON.stringify({ text: transcription, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Transcription error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
