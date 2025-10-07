import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Bucket genérico - funciona com qualquer bucket configurado
const STORAGE_BUCKET = 'e15cbf15-2758-4af5-a1af-8fd3a641b778';

// Detectar content-type automaticamente baseado na extensão
function detectContentType(filename: string, providedMimeType?: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  const mimeTypes: Record<string, string> = {
    'ogg': 'audio/ogg',
    'opus': 'audio/opus',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'm4a': 'audio/mp4',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };

  return mimeTypes[ext] || providedMimeType || 'application/octet-stream';
}

// Determinar pasta baseado no tipo de mídia
function getMediaFolder(mimeType: string): string {
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('image/')) return 'images';
  if (mimeType.startsWith('video/')) return 'videos';
  return 'documents';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileData, mimeType: providedMimeType, filename, workspaceId } = await req.json();
    
    // Detectar content-type correto
    const mimeType = detectContentType(filename, providedMimeType);
    
    console.log('📎 Received upload request:', { 
      filename,
      detectedMimeType: mimeType,
      providedMimeType,
      workspaceId,
      dataLength: fileData?.length
    });

    // Validate required fields
    if (!fileData || !filename || !workspaceId) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Missing required fields: fileData, filename, workspaceId' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with SERVICE_ROLE_KEY for upload
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine folder based on mimeType
    const folder = getMediaFolder(mimeType);

    // Convert base64 to buffer
    const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
    const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const extension = filename.split('.').pop() || 'bin';
    const uniqueFilename = `${timestamp}_${randomId}.${extension}`;
    
    // Upload path padronizado: workspaceId/folder/filename
    const path = `${workspaceId}/${folder}/${uniqueFilename}`;

    console.log('💾 Uploading to Supabase Storage:', { 
      bucket: STORAGE_BUCKET,
      path, 
      size: buffer.length,
      contentType: mimeType 
    });

    // Upload to Supabase Storage usando bucket genérico
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, {
        contentType: mimeType,
        cacheControl: '31536000', // 1 year cache
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to upload to storage',
          details: uploadError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(uploadData.path);

    const publicUrl = publicUrlData.publicUrl;

    console.log('✅ Upload successful:', { 
      publicUrl, 
      path: uploadData.path,
      contentType: mimeType,
      bucket: STORAGE_BUCKET
    });

    // Retornar sempre sucesso com status 200
    return new Response(
      JSON.stringify({ 
        success: true,
        publicUrl,
        path: uploadData.path,
        contentType: mimeType,
        bucket: STORAGE_BUCKET
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error in media upload:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to process upload', 
        details: (error as Error).message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
