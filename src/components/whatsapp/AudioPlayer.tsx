import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AudioPlayerProps {
  audioUrl: string;
  permanentUrl?: string;
  duration?: number;
  className?: string;
  messageId?: string;
  existingTranscription?: string | null;
}

export default function AudioPlayer({ 
  audioUrl, 
  permanentUrl, 
  duration, 
  className = '',
  messageId,
  existingTranscription
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormatSupported, setIsFormatSupported] = useState(true);
  const [transcription, setTranscription] = useState<string | null>(existingTranscription || null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Detectar formato e verificar suporte do navegador
  const getAudioFormat = (url: string): string => {
    const extension = url.split('.').pop()?.toLowerCase() || '';
    if (extension.includes('ogg')) return 'audio/ogg';
    if (extension.includes('mp3')) return 'audio/mpeg';
    if (extension.includes('wav')) return 'audio/wav';
    if (extension.includes('m4a')) return 'audio/mp4';
    if (extension.includes('opus')) return 'audio/opus';
    return 'audio/ogg'; // default
  };

  const checkFormatSupport = (url: string): boolean => {
    const audio = document.createElement('audio');
    const format = getAudioFormat(url);
    const canPlay = audio.canPlayType(format);
    return canPlay === 'probably' || canPlay === 'maybe';
  };

  // Determinar URL final do áudio
  useEffect(() => {
    const finalUrl = permanentUrl || audioUrl;
    
    if (!finalUrl) {
      setError('Áudio não disponível');
      setIsLoading(false);
      return;
    }

    // Verificar se o formato é suportado
    const supported = checkFormatSupport(finalUrl);
    setIsFormatSupported(supported);

    if (!supported) {
      setError('Formato de áudio não suportado pelo navegador');
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  }, [audioUrl, permanentUrl]);

  // Update transcription if prop changes
  useEffect(() => {
    if (existingTranscription) {
      setTranscription(existingTranscription);
    }
  }, [existingTranscription]);

  // Gerenciar eventos do elemento de áudio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration);
      setError(null);
    };

    const handleError = (e: Event) => {
      const audio = e.target as HTMLAudioElement;
      console.error('🎵 Audio load error:', {
        src: audio.src,
        error: audio.error,
        networkState: audio.networkState,
        readyState: audio.readyState
      });
      setError('Não foi possível carregar o áudio');
      setIsFormatSupported(false);
    };

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || !isFormatSupported) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(err => {
            console.error('🎵 Play error:', err);
            setError('Não foi possível reproduzir o áudio');
            setIsFormatSupported(false);
          });
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    if (!isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTranscribe = async () => {
    if (!messageId) {
      toast.error('ID da mensagem não disponível');
      return;
    }

    setIsTranscribing(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-audio-transcribe', {
        body: { messageId }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setTranscription(data.text);
      if (data.cached) {
        toast.success('Transcrição carregada do cache');
      } else {
        toast.success('Áudio transcrito com sucesso!');
      }
    } catch (err: any) {
      console.error('Transcription error:', err);
      toast.error(err.message || 'Erro ao transcrever áudio');
    } finally {
      setIsTranscribing(false);
    }
  };

  // Estado de carregamento
  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 p-3 rounded-lg bg-muted/50 ${className}`}>
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
        <span className="text-sm text-muted-foreground">Carregando áudio...</span>
      </div>
    );
  }

  // Estado de erro ou formato não suportado
  if (error || !isFormatSupported) {
    return (
      <div className={`flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 ${className}`}>
        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-destructive">
            {error || 'Formato não suportado'}
          </span>
          {!isFormatSupported && (
            <span className="text-xs text-muted-foreground">
              Seu navegador não suporta este formato de áudio
            </span>
          )}
        </div>
      </div>
    );
  }

  const finalUrl = permanentUrl || audioUrl;
  if (!finalUrl) {
    return (
      <div className={`flex items-center gap-2 p-3 rounded-lg bg-muted ${className}`}>
        <AlertCircle className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Áudio não disponível</span>
      </div>
    );
  }

  // Renderizar player funcional
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <audio
        ref={audioRef}
        src={finalUrl}
        preload="auto"
      >
        <source src={finalUrl} type={getAudioFormat(finalUrl)} />
        <source src={finalUrl} type="audio/ogg; codecs=opus" />
        <source src={finalUrl} type="audio/ogg" />
        <source src={finalUrl} type="audio/mpeg" />
        <source src={finalUrl} type="audio/wav" />
      </audio>

      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={togglePlayPause}
          disabled={!isFormatSupported}
          className="h-8 w-8 p-0 flex-shrink-0 hover:bg-primary/10"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <div className="flex-1 flex items-center gap-2 min-w-0">
          <input
            type="range"
            min="0"
            max={audioDuration || 0}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            disabled={!isFormatSupported}
            className="flex-1 h-1 bg-primary/20 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap font-mono tabular-nums">
            {formatTime(currentTime)} / {formatTime(audioDuration)}
          </span>
        </div>

        <Volume2 className="h-3.5 w-3.5 text-muted-foreground/70 flex-shrink-0" />
      </div>

      {/* Transcribe button */}
      {messageId && !transcription && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleTranscribe}
          disabled={isTranscribing}
          className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
        >
          {isTranscribing ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Transcrevendo...
            </>
          ) : (
            <>
              <FileText className="h-3 w-3" />
              Transcrever
            </>
          )}
        </Button>
      )}

      {/* Transcription display */}
      {transcription && (
        <div className="mt-1 p-2 bg-background/80 rounded-md border border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-1">Transcrição:</p>
          <p className="text-sm leading-relaxed">{transcription}</p>
        </div>
      )}
    </div>
  );
}
