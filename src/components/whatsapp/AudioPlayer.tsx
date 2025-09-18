
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AudioPlayerProps {
  audioUrl: string;
  originalUrl?: string;
  permanentUrl?: string;
  duration?: number;
  className?: string;
  messageId?: string;
  isFromLead?: boolean;
  debugMode?: boolean;
}

interface UrlTestResult {
  url: string;
  accessible: boolean;
  responseTime: number;
  error?: string;
  mimeType?: string;
}

interface RetryState {
  attempts: number;
  maxAttempts: number;
  lastError?: string;
}

export default function AudioPlayer({ audioUrl, originalUrl, permanentUrl, duration, className = '', messageId, isFromLead = false, debugMode = false }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [retryState, setRetryState] = useState<RetryState>({ attempts: 0, maxAttempts: 3 });
  const [isRetrying, setIsRetrying] = useState(false);
  const [urlDiagnostics, setUrlDiagnostics] = useState<UrlTestResult[]>([]);
  const [showDebugInfo, setShowDebugInfo] = useState(debugMode);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Função para testar acessibilidade de uma URL
  const testUrlAccessibility = async (url: string): Promise<UrlTestResult> => {
    const startTime = Date.now();
    console.log(`🔍 Testing URL accessibility: ${url}`);
    
    try {
      // Primeiro, tentar fazer uma requisição HEAD para verificar se a URL está acessível
      const response = await fetch(url, { 
        method: 'HEAD',
        mode: 'no-cors' // Para evitar CORS issues durante o teste
      });
      
      const responseTime = Date.now() - startTime;
      const mimeType = response.headers.get('content-type') || undefined;
      
      console.log(`🔍 URL test result: ${url} - Status: ${response.status}, Time: ${responseTime}ms, Type: ${mimeType}`);
      
      return {
        url,
        accessible: response.ok || response.status === 0, // status 0 é comum com no-cors
        responseTime,
        mimeType
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.log(`🔍 URL test failed: ${url} - Error: ${error.message}, Time: ${responseTime}ms`);
      
      return {
        url,
        accessible: false,
        responseTime,
        error: error.message
      };
    }
  };

  // Função para diagnosticar todas as URLs disponíveis
  const runUrlDiagnostics = async () => {
    console.log('🔍 Running URL diagnostics...');
    const urlsToTest = getFallbackUrls();
    
    const results: UrlTestResult[] = [];
    for (const url of urlsToTest) {
      const result = await testUrlAccessibility(url);
      results.push(result);
    }
    
    setUrlDiagnostics(results);
    console.log('🔍 URL diagnostics complete:', results);
    return results;
  };

  // URLs de fallback em ordem de prioridade
  const getFallbackUrls = (): string[] => {
    const urls: string[] = [];
    if (permanentUrl) urls.push(permanentUrl);
    if (processedUrl && processedUrl !== permanentUrl) urls.push(processedUrl);
    if (audioUrl && !audioUrl.includes('blob:') && audioUrl !== 'none') urls.push(audioUrl);
    return urls.filter(url => url && url !== 'null' && url !== 'undefined');
  };

  // Função para tentar carregar áudio com fallbacks
  const tryLoadAudio = async (urlToTry: string, attemptNumber: number = 1): Promise<boolean> => {
    return new Promise((resolve) => {
      const testAudio = new Audio();
      const timeout = setTimeout(() => {
        testAudio.src = '';
        console.log(`🎵 Timeout loading audio URL (attempt ${attemptNumber}):`, urlToTry);
        resolve(false);
      }, 10000); // 10 segundos timeout

      testAudio.oncanplaythrough = () => {
        clearTimeout(timeout);
        console.log(`🎵 Audio loaded successfully (attempt ${attemptNumber}):`, urlToTry);
        resolve(true);
      };

      testAudio.onerror = () => {
        clearTimeout(timeout);
        console.log(`🎵 Error loading audio (attempt ${attemptNumber}):`, urlToTry);
        resolve(false);
      };

      testAudio.crossOrigin = 'anonymous';
      testAudio.src = urlToTry;
    });
  };

  // Sistema de retry inteligente com diagnósticos
  const retryWithFallbacks = async () => {
    if (retryState.attempts >= retryState.maxAttempts) {
      console.log('🎵 Max retry attempts reached');
      setError('Áudio não está mais disponível');
      
      // Executar diagnósticos finais
      const diagnostics = await runUrlDiagnostics();
      console.log('🔍 Final diagnostics before giving up:', diagnostics);

      // Última tentativa: se temos permanentUrl em OGG (incompatível no Safari), tentar converter via Edge Function
      try {
        if (permanentUrl && /\.ogg(\?|$)/i.test(permanentUrl)) {
          console.log('🔁 Attempting on-the-fly conversion for OGG (Safari fallback)');
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            console.warn('No auth session available to call converter');
            return; // sem sessão, não tem como chamar a função
          }

          // Baixar o arquivo original
          const originalResp = await fetch(permanentUrl);
          if (!originalResp.ok) {
            console.warn('Failed to fetch original OGG for conversion');
            return;
          }
          const blob = await originalResp.blob();

          const form = new FormData();
          const file = new File([blob], 'audio.ogg', { type: blob.type || 'audio/ogg' });
          form.append('file', file);

          const convResp = await fetch('https://mqotdnvwyjhyiqzbefpm.supabase.co/functions/v1/whatsapp-audio-converter', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}` },
            body: form
          });

          if (convResp.ok) {
            const convJson = await convResp.json();
            if (convJson?.success && convJson.audioData) {
              const b64 = convJson.audioData as string;
              const mime = convJson.mimeType || 'audio/mpeg';
              const binary = atob(b64);
              const len = binary.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
              const convertedBlob = new Blob([bytes], { type: mime });
              const convertedUrl = URL.createObjectURL(convertedBlob);
              console.log('✅ Conversion successful, using converted URL');
              setProcessedUrl(convertedUrl);
              setRetryState(prev => ({ ...prev, attempts: 0 }));
              setIsRetrying(false);
              setError(null);
              return; // sucesso
            }
          } else {
            console.warn('Converter edge function response not OK:', convResp.status);
          }
        }
      } catch (convErr) {
        console.error('Conversion fallback failed:', convErr);
      }

      return;
    }

    setIsRetrying(true);
    setError(null);
    
    const fallbackUrls = getFallbackUrls();
    console.log('🎵 Trying fallback URLs:', fallbackUrls);

    // Primeiro executar diagnósticos em paralelo
    const diagnostics = await runUrlDiagnostics();
    const accessibleUrls = diagnostics.filter(d => d.accessible);
    
    console.log('🔍 URLs accessible according to diagnostics:', accessibleUrls.map(d => d.url));

    // Tentar URLs na ordem: primeiro as acessíveis, depois todas
    const urlsToTry = [...accessibleUrls.map(d => d.url), ...fallbackUrls];
    const uniqueUrls = [...new Set(urlsToTry)]; // Remove duplicatas

    for (const url of uniqueUrls) {
      console.log(`🎵 Attempting to load audio from: ${url}`);
      const success = await tryLoadAudio(url, retryState.attempts + 1);
      if (success) {
        console.log(`✅ Audio successfully loaded from: ${url}`);
        setProcessedUrl(url);
        setRetryState(prev => ({ ...prev, attempts: 0 }));
        setIsRetrying(false);
        return;
      }
    }

    // Se todas as URLs fallharam, tentar reprocessar
    if (messageId && audioUrl.includes('lookaside.fbsbx.com')) {
      console.log('🎵 All fallbacks failed, trying reprocessing...');
      await processAudioUrl(true);
    }

    setRetryState(prev => ({ 
      ...prev, 
      attempts: prev.attempts + 1,
      lastError: 'Falha em todas as URLs disponíveis'
    }));
    setIsRetrying(false);
  };

  // Processar URL do áudio com opção de forçar reprocessamento
  const processAudioUrl = async (forceReprocess: boolean = false) => {
    if (!audioUrl) {
      console.log('🎵 AudioPlayer - No audioUrl provided');
      return;
    }

    // Verificar se há URL válida para reprodução
    if (!audioUrl || audioUrl === 'null' || audioUrl === 'undefined' || audioUrl === 'none') {
      console.log('🎵 AudioPlayer - No valid audio URL available');
      setError('Áudio não disponível');
      return;
    }
    
    // Se já temos uma URL permanente e não estamos forçando, usar diretamente
    if (permanentUrl && !forceReprocess) {
      console.log('🎵 AudioPlayer - Using permanent URL:', permanentUrl);
      const success = await tryLoadAudio(permanentUrl);
      if (success) {
        setProcessedUrl(permanentUrl);
        return;
      }
      console.log('🎵 Permanent URL failed, proceeding with processing...');
    }
    
    console.log('🎵 AudioPlayer - Processing URL:', audioUrl);
    
    // Se é uma URL do WhatsApp API, tentar processar permanentemente
    if (audioUrl.includes('lookaside.fbsbx.com') || audioUrl.includes('scontent.') || audioUrl.includes('graph.facebook.com')) {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('🎵 AudioPlayer - Attempting to process Facebook URL with messageId:', messageId);
        
        if (messageId) {
          // Tentar processar para URL permanente
          const { data, error } = await supabase.functions.invoke('whatsapp-audio-processor', {
            body: { messageId, forceReprocess }
          });

          if (data?.success && data.permanentUrl) {
            console.log('🎵 AudioPlayer - Got permanent URL:', data.permanentUrl);
            const success = await tryLoadAudio(data.permanentUrl);
            if (success) {
              setProcessedUrl(data.permanentUrl);
              setIsLoading(false);
              return;
            }
            console.log('🎵 Permanent URL from processor failed, trying proxy...');
          } else {
            console.log('🎵 AudioPlayer - Processor failed, trying proxy:', data, error);
          }
        }

        // Fallback para proxy
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setError('Não autenticado');
          return;
        }

        const response = await fetch('https://mqotdnvwyjhyiqzbefpm.supabase.co/functions/v1/whatsapp-media-proxy', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: audioUrl })
        });

        if (!response.ok) {
          console.error('🎵 Proxy response error:', response.status, await response.text());
          setError('Áudio não disponível');
          await retryWithFallbacks();
          return;
        }

        // Check if response is JSON (permanent URL) or blob (direct audio)
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const result = await response.json();
          if (result.permanentUrl) {
            console.log('🎵 Using permanent URL from proxy:', result.permanentUrl);
            const success = await tryLoadAudio(result.permanentUrl);
            if (success) {
              setProcessedUrl(result.permanentUrl);
            } else {
              await retryWithFallbacks();
            }
          } else {
            setError('Áudio sendo processado...');
            setTimeout(() => processAudioUrl(true), 3000); // Retry em 3 segundos
          }
        } else {
          // Obter o áudio como blob (fallback)
          const blob = await response.blob();
          
          // Verificar se o blob é válido
          if (blob.size === 0) {
            console.error('🎵 Empty blob received from proxy');
            await retryWithFallbacks();
            return;
          }
          
          const blobUrl = URL.createObjectURL(blob);
          const success = await tryLoadAudio(blobUrl);
          if (success) {
            setProcessedUrl(blobUrl);
            console.log('🎵 Audio processed via proxy (blob):', blobUrl);
          } else {
            URL.revokeObjectURL(blobUrl);
            await retryWithFallbacks();
          }
        }
        
      } catch (err) {
        console.error('🎵 Error processing audio:', err);
        await retryWithFallbacks();
      } finally {
        setIsLoading(false);
      }
    } else {
      // URL normal, testar se funciona
      const success = await tryLoadAudio(audioUrl);
      if (success) {
        setProcessedUrl(audioUrl);
      } else {
        setError('URL de áudio inválida');
      }
    }
  };

  // Função para reprocessar áudio manualmente
  const reprocessAudio = async () => {
    if (!messageId) {
      console.log('🎵 Reprocess skipped - no messageId');
      return;
    }

    try {
      setIsRetrying(true);
      setError(null);
      console.log('🎵 Forcing reprocess via edge function for message:', messageId);

      const { data, error } = await supabase.functions.invoke('whatsapp-audio-processor', {
        body: { messageId, forceReprocess: true }
      });

      if (error) {
        console.error('🎵 Reprocess error:', error);
        setError('Falha ao reprocessar áudio');
        return;
      }

      if (data?.permanentUrl) {
        console.log('🎵 Reprocess returned permanent URL:', data.permanentUrl);
        const success = await tryLoadAudio(data.permanentUrl);
        if (success) {
          setProcessedUrl(data.permanentUrl);
          setRetryState(prev => ({ ...prev, attempts: 0 }));
          setIsRetrying(false);
          setError(null);
          return;
        }
      }

      setError('Reprocessamento concluído sem URL válida');
    } catch (e) {
      console.error('🎵 Reprocess exception:', e);
      setError('Erro ao reprocessar áudio');
    } finally {
      setIsRetrying(false);
    }
  };

  // Simplified audio initialization
  useEffect(() => {
    const initializeAudio = async () => {
      console.log('🎵 AudioPlayer - Initializing:', { permanentUrl, audioUrl, messageId });

      // Check if we have any valid URL
      const urlToUse = permanentUrl || audioUrl;
      if (!urlToUse || urlToUse === 'null' || urlToUse === 'undefined') {
        setError('Áudio não disponível');
        return;
      }

      // If it's a permanent Supabase URL, use it directly
      if (permanentUrl && permanentUrl.includes('supabase.co/storage/v1/object/public/whatsapp-audio/')) {
        console.log('✅ Using permanent URL directly:', permanentUrl);
        const success = await tryLoadAudio(permanentUrl);
        if (success) {
          setProcessedUrl(permanentUrl);
          return;
        }
      }

      // For temporary URLs or failed permanent URLs, try processing
      if (messageId && audioUrl?.includes('mmg.whatsapp.net')) {
        console.log('🔄 Processing temporary URL via audio processor');
        setIsLoading(true);
        try {
          const { data } = await supabase.functions.invoke('whatsapp-audio-processor', {
            body: { messageId }
          });
          
          if (data?.permanentUrl) {
            const success = await tryLoadAudio(data.permanentUrl);
            if (success) {
              setProcessedUrl(data.permanentUrl);
              setIsLoading(false);
              return;
            }
          }
        } catch (error) {
          console.error('Error processing audio:', error);
        }
        setIsLoading(false);
      }

      // Last resort - try the original URL
      const success = await tryLoadAudio(urlToUse);
      if (success) {
        setProcessedUrl(urlToUse);
      } else {
        setError('Áudio não disponível');
      }
    };

    initializeAudio();
  }, [audioUrl, permanentUrl, messageId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !processedUrl) {
      console.log('🎵 AudioPlayer - SKIP SETUP:', { 
        hasAudio: !!audio, 
        hasProcessedUrl: !!processedUrl,
        processedUrl: processedUrl,
        error: error 
      });
      return;
    }

    console.log('🎵 AudioPlayer - STARTING SETUP for URL:', processedUrl);

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (!isNaN(audio.duration)) {
        setAudioDuration(audio.duration);
        console.log('🎵 Audio duration loaded:', audio.duration);
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      console.log('🎵 Audio playback ended');
    };
    const handleLoadStart = () => {
      console.log('🎵 Audio loading started');
      setIsLoading(true);
      setError(null);
      setAudioReady(false);
    };
    const handleCanPlay = () => {
      console.log('🎵 Audio can play - ready');
      setIsLoading(false);
      setError(null);
      setAudioReady(true);
    };
    const handleError = async (e: Event) => {
      console.error('🎵 Audio error:', e, 'URL:', processedUrl);
      const audioElement = e.target as HTMLAudioElement;
      if (audioElement?.error) {
        console.error('🎵 Audio error details:', {
          code: audioElement.error.code,
          message: audioElement.error.message,
          url: processedUrl,
          networkState: audioElement.networkState,
          readyState: audioElement.readyState,
          currentSrc: audioElement.currentSrc
        });
      }
      
      setIsLoading(false);
      setIsPlaying(false);
      setAudioReady(false);
      
      // Tentar fallbacks automaticamente quando houver erro
      if (retryState.attempts < retryState.maxAttempts) {
        console.log('🎵 Audio error detected, trying fallbacks...');
        setTimeout(() => retryWithFallbacks(), 1000);
      } else {
        setError('Áudio não disponível');
      }
    };
    
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    // Set the audio source and load
    audio.src = processedUrl;
    audio.crossOrigin = 'anonymous';
    audio.preload = 'metadata';
    audio.load();

    console.log('🎵 Audio setup complete for:', processedUrl);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [processedUrl]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    console.log('🎵 Toggle play clicked:', { 
      audio: !!audio, 
      processedUrl: !!processedUrl, 
      audioReady, 
      isPlaying,
      currentSrc: audio?.currentSrc,
      readyState: audio?.readyState 
    });
    
    if (!audio || !processedUrl || !audioReady) {
      console.log('🎵 Cannot play - audio not ready:', { audio: !!audio, processedUrl, audioReady });
      return;
    }

    try {
      if (isPlaying) {
        console.log('🎵 Pausing audio');
        audio.pause();
        setIsPlaying(false);
      } else {
        console.log('🎵 Playing audio');
        setIsLoading(true);
        await audio.play();
        setIsPlaying(true);
        setIsLoading(false);
        console.log('🎵 Audio playing successfully');
      }
    } catch (error) {
      console.error('🎵 Error playing audio:', error, 'URL:', processedUrl);
      setError('Erro ao reproduzir áudio');
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  // Para mensagens de áudio não disponíveis, mostrar apenas ícone
  if (error === 'Áudio não disponível') {
    console.log('🎵 AudioPlayer - RENDERING ERROR STATE:', error);
    return (
      <div className={`flex items-center space-x-2 p-2 bg-gray-100 rounded-lg ${className}`}>
        <Volume2 className="h-4 w-4 text-gray-500" />
        <span className="text-xs text-gray-600">
          🎤 Áudio não disponível
        </span>
        {messageId && (
          <Button
            onClick={reprocessAudio}
            size="sm"
            variant="outline"
            className="text-xs px-2 py-1 h-6 ml-2"
          >
            Reprocessar áudio
          </Button>
        )}
        {showDebugInfo && (
          <div className="text-xs text-gray-500 ml-auto">
            {!isFromLead ? '📤 ENVIADO' : '📥 RECEBIDO'} - Sem URL válida
          </div>
        )}
      </div>
    );
  }

  if (error && !isRetrying) {
      return (
      <div className={`space-y-2 p-2 bg-red-50 rounded-lg ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Volume2 className="h-4 w-4 text-red-500" />
            <span className="text-xs text-red-600">{error}</span>
          </div>
          <div className="flex space-x-1">
            {retryState.attempts < retryState.maxAttempts && (
              <Button
                onClick={retryWithFallbacks}
                size="sm"
                variant="outline"
                className="text-xs px-2 py-1 h-6"
              >
                Tentar novamente
              </Button>
            )}
            {messageId && (
              <Button
                onClick={reprocessAudio}
                size="sm"
                variant="outline"
                className="text-xs px-2 py-1 h-6"
              >
                Reprocessar áudio
              </Button>
            )}
            <Button
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              size="sm"
              variant="ghost"
              className="text-xs px-2 py-1 h-6"
            >
              🔍
            </Button>
          </div>
        </div>
        
        {error.includes('disponível') && (
          <div className="text-xs text-gray-500">
            🕐 URLs de áudio do WhatsApp podem expirar. Tentativa {retryState.attempts + 1}/{retryState.maxAttempts}
          </div>
        )}

        {debugMode && (
          <div className="mt-2 space-y-2 bg-gray-50 p-2 rounded text-xs">
            <div className="font-semibold">🔍 Diagnóstico de URLs:</div>
            {urlDiagnostics.length > 0 ? (
              urlDiagnostics.map((result, index) => (
                <div key={index} className="space-y-1">
                  <div className={`flex items-center space-x-2 ${result.accessible ? 'text-green-600' : 'text-red-600'}`}>
                    <span>{result.accessible ? '✅' : '❌'}</span>
                    <span className="font-mono text-xs break-all">{result.url.substring(0, 60)}...</span>
                  </div>
                  <div className="text-gray-500 text-xs ml-6">
                    {result.accessible ? 
                      `Resposta: ${result.responseTime}ms${result.mimeType ? `, Tipo: ${result.mimeType}` : ''}` :
                      `Erro: ${result.error || 'Falha na conexão'} (${result.responseTime}ms)`
                    }
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-500">Nenhum diagnóstico executado ainda</div>
            )}
            
            <Button
              onClick={runUrlDiagnostics}
              size="sm"
              variant="outline"
              className="w-full text-xs mt-2"
            >
              Executar Diagnóstico
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (isRetrying) {
    return (
      <div className={`space-y-2 p-2 bg-blue-50 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-xs text-blue-600">Tentando recarregar áudio...</span>
        </div>
      </div>
    );
  }

  // Player principal - só renderiza se não tem erro
  if (!error && (processedUrl || isLoading)) {
    console.log('🎵 AudioPlayer - RENDERING MAIN PLAYER:', { 
      processedUrl, 
      isLoading, 
      audioReady, 
      error: error || 'none' 
    });
    
    return (
      <div className={`space-y-2 ${className}`}>
        {/* Debug info */}
        {debugMode && (
          <div className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded">
            🎵 PLAYER STATUS: URL={processedUrl ? 'OK' : 'NO'} | 
            Ready={audioReady ? 'YES' : 'NO'} | 
            Loading={isLoading ? 'YES' : 'NO'} | 
            Error={error || 'NONE'}
          </div>
        )}
        
        <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg">
          <Button
            onClick={() => {
              console.log('🎵 AudioPlayer - Play button clicked');
              togglePlay();
            }}
            size="sm"
            variant="ghost"
            className="p-2 h-8 w-8"
            disabled={isLoading || !processedUrl || !audioReady || isRetrying}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            ) : isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <Volume2 className="h-4 w-4 text-gray-500" />

          <div className="flex-1 min-w-0">
            <div className="w-full bg-gray-300 rounded-full h-1">
              <div
                className="bg-blue-500 h-1 rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <span className="text-xs text-gray-500 tabular-nums">
            {formatTime(currentTime)} / {formatTime(audioDuration)}
          </span>
        </div>

        <audio
          ref={audioRef}
          className="hidden"
        />
      </div>
    );
  }

  // Estado final - se chegou aqui, algo está errado
  console.log('🎵 AudioPlayer - FALLBACK STATE:', { error, processedUrl, isLoading });
  return (
    <div className={`flex items-center space-x-2 p-2 bg-red-100 rounded-lg ${className}`}>
      <Volume2 className="h-4 w-4 text-red-500" />
      <span className="text-xs text-red-600">Player em estado inconsistente</span>
      {debugMode && (
        <div className="text-xs text-red-500 ml-auto">
          ERROR={error || 'none'} | URL={processedUrl || 'none'}
        </div>
      )}
    </div>
  );
}
