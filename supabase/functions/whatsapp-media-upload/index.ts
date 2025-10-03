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
    const { fileData, mimeType, filename, workspaceId } = await req.json();
    
    console.log('📎 Received base64 upload request:', { 
      filename,
      mimeType,
      workspaceId,
      dataLength: fileData?.length
    });

    // Validate required fields
    if (!fileData || !mimeType || !filename || !workspaceId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: fileData, mimeType, filename, workspaceId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with SERVICE_ROLE_KEY for upload
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine folder based on mimeType - APENAS audio/ e images/
    let folder = 'images'; // default
    if (mimeType.startsWith('audio/')) {
      folder = 'audio';
    } else if (mimeType.startsWith('image/')) {
      folder = 'images';
    }

    // Convert base64 to buffer
    const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
    const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const extension = filename.split('.').pop() || 'bin';
    const uniqueFilename = `${timestamp}_${randomId}.${extension}`;
    
    // Upload path: <folder>/<filename> dentro do bucket e15cbf15-2758-4af5-a1af-8fd3a641b778
    const path = `${folder}/${uniqueFilename}`;

    console.log('💾 Uploading to Supabase Storage:', { path, size: buffer.length });

    // Upload to Supabase Storage - BUCKET ÚNICO: e15cbf15-2758-4af5-a1af-8fd3a641b778
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('e15cbf15-2758-4af5-a1af-8fd3a641b778')
      .upload(path, buffer, {
        contentType: mimeType,
        cacheControl: '31536000', // 1 year cache
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to upload to storage',
          details: uploadError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('e15cbf15-2758-4af5-a1af-8fd3a641b778')
      .getPublicUrl(uploadData.path);

    const publicUrl = publicUrlData.publicUrl;

    console.log('✅ Upload successful:', { publicUrl, path: uploadData.path });

    return new Response(
      JSON.stringify({ 
        success: true,
        publicUrl,
        path: uploadData.path
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in media upload:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process upload', 
        details: (error as Error).message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
