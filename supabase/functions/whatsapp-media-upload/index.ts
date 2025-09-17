import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configurações da API Glav (centralizadas)
const GLAV_CONFIG = {
  baseUrl: 'https://api.glav.com.br/audio/convert.php',
  outputFormat: 'opus', // Formato para WhatsApp: opus (mais compatível)
  quality: 'medium', // Otimizado para WhatsApp
  timeout: 30000,
  maxRetries: 2,
  retryDelay: 1000
};

// Cache simples para conversões idênticas (evita reconversões)
const conversionCache = new Map<string, { data: Uint8Array; timestamp: number; mimeType: string }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Função para sleep (delay)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Função para gerar hash simples do conteúdo
function generateContentHash(data: Uint8Array): string {
  let hash = 0;
  for (let i = 0; i < Math.min(data.length, 1000); i++) { // Sample first 1000 bytes
    hash = ((hash << 5) - hash + data[i]) & 0xffffffff;
  }
  return `${hash}_${data.length}`;
}

// Convert audio using optimized Glav API with cache and retry
async function convertAudioWithGlavAPI(inputData: Uint8Array, attempt = 1): Promise<Uint8Array> {
  console.log('🔄 Starting optimized audio conversion using Glav API...');
  console.log(`📊 Input file size: ${inputData.length} bytes`);

  // Verificar cache primeiro
  const contentHash = generateContentHash(inputData);
  const cached = conversionCache.get(contentHash);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log('⚡ Cache hit! Usando conversão em cache');
    return cached.data;
  }

  try {
    
    // Preparar FormData otimizado para Glav API - enviar arquivo binário diretamente
    const glavFormData = new FormData();
    const audioBlob = new Blob([inputData], { type: 'audio/webm' });
    glavFormData.append('audio', audioBlob, 'audio.webm');
    
    // Adicionar parâmetros opcionais se a API suportar
    if (GLAV_CONFIG.outputFormat) {
      glavFormData.append('output_format', GLAV_CONFIG.outputFormat);
    }
    if (GLAV_CONFIG.quality) {
      glavFormData.append('quality', GLAV_CONFIG.quality);
    }

    console.log(`📤 Tentativa ${attempt}/${GLAV_CONFIG.maxRetries + 1} - Enviando arquivo binário para Glav API...`);
    console.log(`🌐 Config: formato=${GLAV_CONFIG.outputFormat}, qualidade=${GLAV_CONFIG.quality}`);

    // Criar controller para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GLAV_CONFIG.timeout);

    let response;
    try {
      // Send conversion request to Glav API
      response = await fetch(GLAV_CONFIG.baseUrl, {
        method: 'POST',
        body: glavFormData,
        headers: {
          'User-Agent': 'Supabase-Edge-Function/2.0',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error(`⏰ Timeout após ${GLAV_CONFIG.timeout}ms`);
        
        if (attempt <= GLAV_CONFIG.maxRetries) {
          console.log(`⏳ Retry após timeout - aguardando ${GLAV_CONFIG.retryDelay * attempt}ms...`);
          await sleep(GLAV_CONFIG.retryDelay * attempt);
          return convertAudioWithGlavAPI(inputData, attempt + 1);
        }
        
        throw new Error(`Timeout após ${GLAV_CONFIG.timeout}ms - todas as tentativas falharam`);
      }
      
      throw fetchError;
    }

    console.log(`📡 Glav API Response Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Glav API error ${response.status}:`, errorText);
      
      
      // Retry para erros temporários
      if ((response.status === 429 || response.status === 503) && attempt <= GLAV_CONFIG.maxRetries) {
        console.log(`⏳ Retry para status ${response.status} - aguardando ${GLAV_CONFIG.retryDelay * attempt}ms...`);
        await sleep(GLAV_CONFIG.retryDelay * attempt);
        return convertAudioWithGlavAPI(inputData, attempt + 1);
      }
      
      throw new Error(`Glav API failed with status ${response.status}: ${errorText}`);
    }

    // Parse the JSON response from Glav API
    let glavResponse;
    try {
      glavResponse = await response.json();
      console.log('📡 Glav API JSON Response:', glavResponse);
    } catch (jsonError) {
      console.error(`❌ Failed to parse Glav API JSON response:`, jsonError);
      throw new Error('Invalid JSON response from Glav API');
    }

    // Check if conversion was successful
    if (!glavResponse.success) {
      console.error(`❌ Glav API conversion failed:`, glavResponse);
      throw new Error(`Glav API conversion failed: ${glavResponse.error || 'Unknown error'}`);
    }

    if (!glavResponse.url) {
      console.error(`❌ No download URL in Glav API response:`, glavResponse);
      throw new Error('No download URL provided by Glav API');
    }

    // Download the converted file
    console.log('📥 Downloading converted audio from Glav API...');
    const downloadResponse = await fetch(glavResponse.url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Supabase-Edge-Function/2.0'
      }
    });

    if (!downloadResponse.ok) {
      console.error(`❌ Failed to download converted audio: ${downloadResponse.status} ${downloadResponse.statusText}`);
      throw new Error(`Failed to download converted audio: ${downloadResponse.status} ${downloadResponse.statusText}`);
    }

    const convertedArrayBuffer = await downloadResponse.arrayBuffer();
    const convertedData = new Uint8Array(convertedArrayBuffer);
    
    console.log(`✅ Audio conversion completed successfully using Glav API`);
    console.log(`📊 Converted file size: ${convertedData.length} bytes (original: ${inputData.length} bytes)`);
    
    if (convertedData.length === 0) {
      throw new Error('Converted file is empty');
    }
    
    // Cache da conversão bem-sucedida - detectar formato real da URL retornada
    let mimeType = 'audio/opus'; // Default para OPUS já que configuramos para retornar .opus
    
    // Detectar formato baseado na URL retornada pela Glav
    if (glavResponse.url) {
      if (glavResponse.url.includes('.opus')) {
        mimeType = 'audio/opus';
      } else if (glavResponse.url.includes('.ogg')) {
        mimeType = 'audio/ogg';
      } else if (glavResponse.url.includes('.mp3')) {
        mimeType = 'audio/mp3';
      }
    }
    
    console.log(`🎵 Detected audio format from Glav URL: ${mimeType}`);
    
    conversionCache.set(contentHash, {
      data: convertedData,
      timestamp: Date.now(),
      mimeType
    });
    
    // Limpeza de cache antigo
    for (const [key, value] of conversionCache.entries()) {
      if (Date.now() - value.timestamp > CACHE_TTL) {
        conversionCache.delete(key);
      }
    }
    
    return convertedData;

  } catch (error) {
    console.error(`❌ Audio conversion failed (attempt ${attempt}):`, error);
    
    // Retry final se não foi a última tentativa
    if (attempt <= GLAV_CONFIG.maxRetries) {
      console.log(`⏳ Final retry - aguardando ${GLAV_CONFIG.retryDelay * attempt}ms...`);
      await sleep(GLAV_CONFIG.retryDelay * attempt);
      return convertAudioWithGlavAPI(inputData, attempt + 1);
    }
    
    throw new Error(`Audio conversion failed after ${attempt} attempts: ${(error as Error).message}`);
  }
}

serve(async (req) => {
  console.log(`[${new Date().toISOString()}] Media upload request started`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body with detailed validation
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { fileData, mimeType, filename } = requestBody;
    
    // Detailed validation of required fields
    if (!fileData) {
      console.error('Missing fileData in request');
      return new Response(
        JSON.stringify({ error: 'fileData is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!mimeType) {
      console.error('Missing mimeType in request');
      return new Response(
        JSON.stringify({ error: 'mimeType is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${new Date().toISOString()}] Request validated:`, { 
      mimeType, 
      filename: filename || 'no filename provided', 
      fileDataLength: fileData?.length,
      fileDataPrefix: fileData?.substring(0, 50) + '...'
    });

    // Enhanced authentication handling
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authToken = authHeader.replace('Bearer ', '');
    if (!authToken) {
      console.error('Invalid authorization header format');
      return new Response(
        JSON.stringify({ error: 'Invalid authorization header format' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser(authToken);
    if (userError || !user) {
      console.error('User authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${new Date().toISOString()}] User authenticated:`, user.id);

    // Get workspace with better error handling
    const { data: workspaceMember, error: workspaceError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (workspaceError) {
      console.error('Error fetching workspace:', workspaceError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch workspace information' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!workspaceMember) {
      console.error('No workspace found for user:', user.id);
      return new Response(
        JSON.stringify({ error: 'No workspace found for user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${new Date().toISOString()}] Workspace found:`, workspaceMember.workspace_id);

    // Get WhatsApp config with detailed validation
    const { data: config, error: configError } = await supabase
      .from('whatsapp_official_configs')
      .select('access_token, phone_number_id')
      .eq('workspace_id', workspaceMember.workspace_id)
      .eq('is_active', true)
      .maybeSingle();

    if (configError) {
      console.error('Error fetching WhatsApp config:', configError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch WhatsApp configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!config) {
      console.error('WhatsApp config not found for workspace:', workspaceMember.workspace_id);
      return new Response(
        JSON.stringify({ error: 'WhatsApp configuration not found or inactive' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!config.access_token || !config.phone_number_id) {
      console.error('Incomplete WhatsApp config:', { 
        hasAccessToken: !!config.access_token, 
        hasPhoneNumberId: !!config.phone_number_id 
      });
      return new Response(
        JSON.stringify({ error: 'Incomplete WhatsApp configuration' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${new Date().toISOString()}] WhatsApp config validated for phone:`, config.phone_number_id);

    // Enhanced base64 decoding with validation
    let binaryData;
    try {
      // Validate base64 format
      const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
      
      if (!base64Data || base64Data.length === 0) {
        throw new Error('Empty base64 data');
      }

      // Test decode a small portion first to validate format
      try {
        atob(base64Data.substring(0, Math.min(100, base64Data.length)));
      } catch (testError) {
        throw new Error('Invalid base64 format');
      }

      binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      if (binaryData.length === 0) {
        throw new Error('Decoded data is empty');
      }

      console.log(`[${new Date().toISOString()}] Binary data decoded:`, { 
        size: binaryData.length,
        sizeInKB: Math.round(binaryData.length / 1024)
      });

    } catch (error) {
      console.error('Error decoding base64:', error);
      return new Response(
        JSON.stringify({ error: `Invalid file data format: ${error.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size (WhatsApp limit is 16MB)
    if (binaryData.length > 16 * 1024 * 1024) {
      console.error('File too large:', binaryData.length);
      return new Response(
        JSON.stringify({ error: 'File size exceeds 16MB limit' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${new Date().toISOString()}] Starting media processing...`);

    let finalMimeType = mimeType;
    let finalFilename = filename || `media_${Date.now()}`;

    // Convert audio/webm to audio/opus for WhatsApp compatibility using Glav API
    if (mimeType.includes('audio/webm')) {
      console.log(`[${new Date().toISOString()}] Converting audio from WebM to OPUS using Glav API...`);
      
      try {
        const originalSize = binaryData.length;
        binaryData = await convertAudioWithGlavAPI(binaryData);
        finalMimeType = 'audio/opus'; // Formato OPUS que é mais compatível com WhatsApp
        finalFilename = finalFilename.replace(/\.webm$/, '.opus');
        
        console.log(`[${new Date().toISOString()}] Audio converted successfully:`, {
          originalMimeType: mimeType,
          finalMimeType,
          originalSize,
          newSize: binaryData.length,
          compressionRatio: Math.round((binaryData.length / originalSize) * 100) + '%'
        });
        
      } catch (conversionError) {
        console.error(`[${new Date().toISOString()}] Audio conversion failed:`, conversionError);
        console.log('Attempting fallback: sending WebM as OPUS to WhatsApp');
        
        // Fallback: try sending WebM as OPUS (more compatible format)
        finalMimeType = 'audio/opus';
        finalFilename = finalFilename.replace(/\.webm$/, '.opus');
        
        console.log(`[${new Date().toISOString()}] Using fallback approach:`, {
          originalMimeType: mimeType,
          fallbackMimeType: finalMimeType,
          note: 'WebM data with OGG mime type'
        });
      }
    }

    console.log(`[${new Date().toISOString()}] Uploading to WhatsApp Media API:`, {
      finalMimeType,
      finalFilename,
      dataSize: binaryData.length,
      phoneNumberId: config.phone_number_id
    });

    // Fix mime type for WhatsApp compatibility
    let whatsappMimeType = finalMimeType;
    if (finalMimeType === 'audio/mp3') {
      whatsappMimeType = 'audio/mpeg'; // WhatsApp requires audio/mpeg instead of audio/mp3
      console.log(`🔄 Converting mime type from ${finalMimeType} to ${whatsappMimeType} for WhatsApp compatibility`);
    } else if (finalMimeType === 'audio/opus') {
      // WhatsApp aceita audio/opus diretamente, sem necessidade de conversão
      whatsappMimeType = 'audio/opus';
      console.log(`✅ Using OPUS format directly for WhatsApp: ${whatsappMimeType}`);
    } else if (finalMimeType === 'audio/ogg') {
      // WhatsApp aceita audio/ogg diretamente também
      whatsappMimeType = 'audio/ogg';
      console.log(`✅ Using OGG format directly for WhatsApp: ${whatsappMimeType}`);
    }

    // Prepare FormData for WhatsApp API
    const formData = new FormData();
    const blob = new Blob([binaryData], { type: whatsappMimeType });
    formData.append('file', blob, finalFilename);
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', 'audio');

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${config.phone_number_id}/media`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.access_token}`,
        },
        body: formData
      }
    );

    const responseData = await response.json();
    console.log(`[${new Date().toISOString()}] WhatsApp Media API response:`, { 
      status: response.status,
      statusText: response.statusText,
      responseData 
    });

    if (!response.ok) {
      console.error('WhatsApp Media API error:', {
        status: response.status,
        statusText: response.statusText,
        responseData
      });
      return new Response(
        JSON.stringify({ 
          error: 'Failed to upload media to WhatsApp', 
          details: responseData.error?.message || 'Unknown error',
          status: response.status,
          whatsappError: responseData
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!responseData.id) {
      console.error('WhatsApp API response missing media ID:', responseData);
      return new Response(
        JSON.stringify({ 
          error: 'WhatsApp API response missing media ID',
          responseData 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${new Date().toISOString()}] Media uploaded successfully. MediaId:`, responseData.id);

    // IMPORTANTE: Para o WhatsApp API, retornar apenas o media_id
    // Não retornar URLs temporárias que expiram
    return new Response(
      JSON.stringify({ 
        success: true,
        mediaId: responseData.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Unexpected error in media upload:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error during media upload',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});