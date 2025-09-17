import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configurações da API Glav
const GLAV_CONFIG = {
  baseUrl: 'https://api.glav.com.br/audio/convert.php',
  outputFormat: 'opus', // Formato de saída preferido: opus (melhor para WhatsApp)
  quality: 'medium', // Qualidade: low, medium, high
  timeout: 30000, // 30 segundos
  maxRetries: 2,
  retryDelay: 1000 // 1 segundo
};

// Função para sleep (delay)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Função para processar o áudio para WhatsApp (nativo)
async function processAudioNatively(audioData: string, mimeType: string): Promise<{ success: boolean; audioData?: string; mimeType?: string; error?: string }> {
  try {
    console.log('🎵 Processing audio natively - keeping original format if compatible');
    
    // Se já é OGG, retorna como está
    if (mimeType.includes('ogg')) {
      console.log('✅ Audio is already OGG format');
      return {
        success: true,
        audioData,
        mimeType: 'audio/ogg'
      };
    }

    // Para WebM/WAV, tentamos manter o formato original primeiro
    console.log('🔄 Keeping original format for compatibility test');
    return {
      success: true,
      audioData,
      mimeType: mimeType.includes('webm') ? 'audio/webm' : 'audio/ogg'
    };

  } catch (error) {
    console.error('❌ Native audio processing failed:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

// Função otimizada para chamar a API Glav com retry e configurações
async function convertWithGlavAPI(audioData: string, mimeType: string, attempt = 1): Promise<{ success: boolean; audioData?: string; error?: string; mimeType?: string }> {
  try {
    console.log(`🔄 Tentativa ${attempt}/${GLAV_CONFIG.maxRetries + 1} - Enviando para Glav API`);
    
    // Converte base64 para binary
    const binaryData = atob(audioData);
    const uint8Array = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      uint8Array[i] = binaryData.charCodeAt(i);
    }

    // Prepara FormData para a API
    const formData = new FormData();
    const audioBlob = new Blob([uint8Array], { type: mimeType });
    formData.append('audio', audioBlob, 'input.' + (mimeType.includes('webm') ? 'webm' : 'wav'));
    formData.append('output_format', 'ogg');
    formData.append('codec', 'opus');
    formData.append('quality', GLAV_CONFIG.quality);

    console.log('📤 Enviando requisição para Glav API...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GLAV_CONFIG.timeout);

    try {
      const response = await fetch(GLAV_CONFIG.baseUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        headers: {
          'User-Agent': 'WhatsApp-Audio-Converter/1.0'
        }
      });

      clearTimeout(timeoutId);

      console.log(`📥 Resposta da Glav API: ${response.status} ${response.statusText}`);

      if (response.status === 429) {
        console.log('⏳ Rate limit atingido, tentando novamente...');
        if (attempt <= GLAV_CONFIG.maxRetries) {
          await sleep(GLAV_CONFIG.retryDelay * attempt);
          return await convertWithGlavAPI(audioData, mimeType, attempt + 1);
        }
        throw new Error('Rate limit excedido após múltiplas tentativas');
      }

      if (response.status === 503) {
        console.log('🔄 Serviço indisponível, tentando novamente...');
        if (attempt <= GLAV_CONFIG.maxRetries) {
          await sleep(GLAV_CONFIG.retryDelay * attempt);
          return await convertWithGlavAPI(audioData, mimeType, attempt + 1);
        }
        throw new Error('Serviço indisponível após múltiplas tentativas');
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na API: ${response.status} - ${errorText}`);
      }

      // Verifica se a resposta é áudio
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('audio/') && !contentType.includes('application/octet-stream')) {
        const responseText = await response.text();
        console.error('❌ Resposta inesperada da API:', responseText);
        throw new Error('Resposta inválida da API de conversão');
      }

      // Converte resposta para base64
      const audioBuffer = await response.arrayBuffer();
      const convertedArray = new Uint8Array(audioBuffer);
      const convertedBase64 = btoa(String.fromCharCode(...convertedArray));

      console.log('✅ Conversão Glav API bem-sucedida:', {
        originalSize: audioData.length,
        convertedSize: convertedBase64.length,
        outputMimeType: 'audio/ogg'
      });

      return {
        success: true,
        audioData: convertedBase64,
        mimeType: 'audio/ogg'
      };

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.log('⏰ Timeout na requisição para Glav API');
        if (attempt <= GLAV_CONFIG.maxRetries) {
          await sleep(GLAV_CONFIG.retryDelay);
          return await convertWithGlavAPI(audioData, mimeType, attempt + 1);
        }
        throw new Error('Timeout na conversão de áudio');
      }
      throw fetchError;
    }

  } catch (error: any) {
    console.error(`❌ Erro na tentativa ${attempt}:`, error.message);
    
    if (attempt <= GLAV_CONFIG.maxRetries) {
      console.log(`🔄 Tentando novamente em ${GLAV_CONFIG.retryDelay}ms...`);
      await sleep(GLAV_CONFIG.retryDelay);
      return await convertWithGlavAPI(audioData, mimeType, attempt + 1);
    }

    return {
      success: false,
      error: error.message
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎵 Audio converter - Processing request...');
    
    const { audioData, mimeType } = await req.json();
    
    if (!audioData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Dados de áudio não fornecidos' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('📦 Received audio data:', {
      mimeType,
      dataLength: audioData.length,
      sample: audioData.substring(0, 50) + '...'
    });

    // Try native processing first
    const nativeResult = await processAudioNatively(audioData, mimeType || 'audio/webm');
    if (nativeResult.success) {
      console.log('✅ Native processing successful');
      return new Response(
        JSON.stringify({
          success: true,
          audioData: nativeResult.audioData,
          mimeType: nativeResult.mimeType
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('⚠️ Native processing failed, trying Glav API...');

    // If native processing fails, try Glav API conversion
    const glavResult = await convertWithGlavAPI(audioData, mimeType || 'audio/webm');
    
    if (glavResult.success) {
      console.log('✅ Glav API conversion successful');
      return new Response(
        JSON.stringify({
          success: true,
          audioData: glavResult.audioData,
          mimeType: glavResult.mimeType || 'audio/ogg'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Both methods failed
    console.error('❌ All conversion methods failed');
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Falha na conversão: ${nativeResult.error || glavResult.error}` 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Audio converter error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Erro interno: ${(error as Error).message}` 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});