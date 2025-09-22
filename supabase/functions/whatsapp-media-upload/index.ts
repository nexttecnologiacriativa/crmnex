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
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const mediaType = formData.get('mediaType') as string;
    
    console.log('📎 Received file upload request:', { 
      fileName: file?.name,
      fileSize: file?.size,
      mediaType,
      fileType: file?.type
    });

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Try to get WhatsApp Official config first
    const { data: officialConfig } = await supabase
      .from('whatsapp_official_configs')
      .select('access_token, phone_number_id')
      .eq('workspace_id', workspaceMember.workspace_id)
      .eq('is_active', true)
      .single();

    // If no official config, try Evolution API config
    let evolutionConfig = null;
    if (!officialConfig?.access_token) {
      const { data: evolutionData } = await supabase
        .from('whatsapp_evolution_configs')
        .select('*')
        .eq('workspace_id', workspaceMember.workspace_id)
        .single();
      
      evolutionConfig = evolutionData;
    }

    const isUsingOfficial = !!officialConfig?.access_token;
    const isUsingEvolution = !!evolutionConfig;

    if (!isUsingOfficial && !isUsingEvolution) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma configuração do WhatsApp encontrada. Configure WhatsApp Oficial ou Evolution API.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ WhatsApp config found, using:', isUsingOfficial ? 'Official API' : 'Evolution API');

    // Validate file type and size based on media type
    let maxSize = 16 * 1024 * 1024; // 16MB default
    let allowedTypes: string[] = [];

    if (mediaType === 'image') {
      maxSize = 5 * 1024 * 1024; // 5MB for images
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    } else if (mediaType === 'video') {
      maxSize = 16 * 1024 * 1024; // 16MB for videos
      allowedTypes = ['video/mp4', 'video/3gpp', 'video/quicktime'];
    } else if (mediaType === 'audio') {
      maxSize = 16 * 1024 * 1024; // 16MB for audio
      allowedTypes = ['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg'];
    } else if (mediaType === 'document') {
      maxSize = 100 * 1024 * 1024; // 100MB for documents
      allowedTypes = ['application/pdf', 'application/vnd.ms-powerpoint', 'application/msword', 'text/plain', 'application/vnd.ms-excel'];
    }

    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ error: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!allowedTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ File validation passed, uploading...');

    let mediaId = '';
    
    if (isUsingOfficial && officialConfig) {
      // Upload to WhatsApp Official API
      const whatsappFormData = new FormData();
      whatsappFormData.append('file', file);
      whatsappFormData.append('type', file.type);
      whatsappFormData.append('messaging_product', 'whatsapp');

      const uploadResponse = await fetch(
        `https://graph.facebook.com/v18.0/${officialConfig.phone_number_id}/media`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${officialConfig.access_token}`,
          },
          body: whatsappFormData,
        }
      );

      const uploadData = await uploadResponse.json();
      console.log('📤 WhatsApp Official API response:', JSON.stringify(uploadData, null, 2));

      if (!uploadResponse.ok || uploadData.error) {
        console.error('❌ WhatsApp Official API error:', uploadData);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to upload media to WhatsApp Official API', 
            details: uploadData.error?.message || 'Unknown error',
            whatsappResponse: uploadData
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      mediaId = uploadData.id;
      console.log('✅ Media uploaded to Official API with ID:', mediaId);
      
    } else if (isUsingEvolution) {
      // For Evolution API, we just save to storage and generate a unique media ID
      // Evolution API handles media differently - it fetches from URLs
      mediaId = `evolution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('✅ Generated Evolution API media ID:', mediaId);
    }

    // Save media permanently to Supabase Storage
    let permanentUrl = null;
    try {
      console.log('💾 Saving media permanently to Supabase Storage...');
      
      const fileBuffer = await file.arrayBuffer();
      const fileName = `${Date.now()}_${mediaId}.${file.name.split('.').pop()}`;
      const filePath = `${workspaceMember.workspace_id}/${mediaType}s/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('whatsapp-media')
        .upload(filePath, fileBuffer, {
          contentType: file.type,
          cacheControl: '31536000', // 1 year cache
          upsert: false
        });

      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('whatsapp-media')
          .getPublicUrl(uploadData.path);
        
        if (publicUrlData.publicUrl) {
          permanentUrl = publicUrlData.publicUrl;
          console.log('✅ Media saved permanently with public URL:', permanentUrl);
        }
      } else {
        console.error('❌ Failed to save media permanently:', uploadError);
        // For Evolution API, this is critical as it needs the permanent URL
        if (isUsingEvolution) {
          return new Response(
            JSON.stringify({ 
              error: 'Failed to save media to storage - required for Evolution API',
              details: uploadError?.message || 'Storage error'
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } catch (storageError) {
      console.error('❌ Error saving media to permanent storage:', storageError);
      if (isUsingEvolution) {
        return new Response(
          JSON.stringify({ 
            error: 'Storage error - required for Evolution API',
            details: (storageError as Error).message
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        mediaId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        mediaType,
        permanentUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error uploading media:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to upload media', 
        details: (error as Error).message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});