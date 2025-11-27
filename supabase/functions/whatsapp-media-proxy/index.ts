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
    const { url: mediaUrl } = await req.json();
    
    if (!mediaUrl) {
      return new Response(JSON.stringify({ error: 'URL parameter required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get authorization header
    const authToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authToken) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(authToken);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get user's workspace and WhatsApp config
    const { data: workspaceMember } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single();

    if (!workspaceMember) {
      return new Response(JSON.stringify({ error: 'No workspace found' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Try WhatsApp Official API first
    const { data: officialConfig } = await supabase
      .from('whatsapp_official_configs')
      .select('access_token')
      .eq('workspace_id', workspaceMember.workspace_id)
      .eq('is_active', true)
      .maybeSingle();

    // If no official config, try Evolution API from database
    const { data: evolutionConfig } = await supabase
      .from('whatsapp_evolution_configs')
      .select('api_url, global_api_key')
      .eq('workspace_id', workspaceMember.workspace_id)
      .maybeSingle();

    // 🔥 FALLBACK: Use environment variables if no database config
    const evolutionApiUrl = evolutionConfig?.api_url || Deno.env.get('EVOLUTION_API_URL');
    const evolutionApiKey = evolutionConfig?.global_api_key || Deno.env.get('EVOLUTION_API_KEY');

    console.log('📥 Fetching media from WhatsApp:', mediaUrl);
    console.log('🔧 Config:', { 
      hasOfficialConfig: !!officialConfig?.access_token,
      hasEvolutionDBConfig: !!evolutionConfig,
      hasEvolutionEnvConfig: !!evolutionApiUrl && !!evolutionApiKey
    });

    // Retry logic with exponential backoff
    const maxRetries = 3;
    const timeoutMs = 30000; // 30 seconds
    let mediaResponse: Response | null = null;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${maxRetries} to fetch media`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
          if (officialConfig?.access_token) {
            console.log('📥 Using WhatsApp Official API');
            mediaResponse = await fetch(mediaUrl, {
              headers: {
                'Authorization': `Bearer ${officialConfig.access_token}`,
              },
              signal: controller.signal,
            });
          } else if (evolutionApiUrl && evolutionApiKey) {
            console.log('📥 Using Evolution API - direct download');
            mediaResponse = await fetch(mediaUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': '*/*',
                'Connection': 'keep-alive',
              },
              signal: controller.signal,
            });
          } else {
            console.error('❌ No WhatsApp configuration found');
            return new Response(JSON.stringify({ 
              error: 'WhatsApp not configured',
              details: 'Neither official config, evolution DB config, nor environment variables found'
            }), { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        } finally {
          clearTimeout(timeoutId);
        }

        if (mediaResponse.ok) {
          console.log(`✅ Media fetched successfully on attempt ${attempt}`);
          break;
        }

        console.warn(`⚠️ Attempt ${attempt} failed with status ${mediaResponse.status}`);
        lastError = new Error(`HTTP ${mediaResponse.status}: ${await mediaResponse.text()}`);
        
        // Don't retry on 4xx errors (client errors)
        if (mediaResponse.status >= 400 && mediaResponse.status < 500) {
          break;
        }

      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed:`, error);
        lastError = error as Error;
        
        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (!mediaResponse || !mediaResponse.ok) {
      const errorDetails = lastError?.message || 'Unknown error';
      console.error('❌ Failed to fetch media after all retries:', errorDetails);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch media from WhatsApp',
        details: errorDetails,
        attempts: maxRetries
      }), { 
        status: 502, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get the media data as array buffer
    const mediaBuffer = await mediaResponse.arrayBuffer();
    const originalContentType = mediaResponse.headers.get('content-type');
    const contentType = originalContentType || 'application/octet-stream';
    
    console.log('✅ Media fetched successfully:', {
      size: mediaBuffer.byteLength,
      contentType: originalContentType,
      finalContentType: contentType
    });

    // Save audio permanently if it's audio content
    if (contentType.startsWith('audio/')) {
      try {
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.ogg`;
        const filePath = `${workspaceMember.workspace_id}/${fileName}`;
        
        console.log('💾 Saving audio permanently:', filePath);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('whatsapp-media')
          .upload(`audio/${fileName}`, mediaBuffer, {
            contentType: contentType,
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('❌ Failed to save audio permanently:', uploadError);
        } else {
          console.log('✅ Audio saved permanently:', uploadData.path);
          
          // Return permanent URL instead of proxied content
          const { data: publicUrlData } = supabase.storage
            .from('whatsapp-media')
            .getPublicUrl(uploadData.path);
          
          if (publicUrlData.publicUrl) {
            return new Response(JSON.stringify({ 
              permanentUrl: publicUrlData.publicUrl,
              originalUrl: mediaUrl 
            }), {
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            });
          }
        }
      } catch (error) {
        console.error('❌ Error saving audio:', error);
      }
    }
    
    // Return the media preserving original content-type (fallback)
    return new Response(mediaBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Accept-Ranges': 'bytes',
        'Content-Length': mediaBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('Media proxy error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});