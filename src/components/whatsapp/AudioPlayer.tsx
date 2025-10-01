import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AudioPlayerProps {
  audioUrl: string;
  permanentUrl?: string;
  duration?: number;
  className?: string;
  messageId?: string;
  isFromLead?: boolean;
}

export default function AudioPlayer({ 
  audioUrl, 
  permanentUrl, 
  duration, 
  className = '', 
  messageId
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalAudioUrl, setFinalAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Usar URL permanente ou audioUrl do Supabase Storage
  useEffect(() => {
    console.log('🎵 AudioPlayer props:', { permanentUrl, audioUrl, messageId });

    // Prioridade 1: permanentUrl do Supabase Storage
    if (permanentUrl && permanentUrl.includes('supabase.co/storage/v1/object/public/whatsapp-media/')) {
      console.log('✅ Using permanentUrl:', permanentUrl);
      setFinalAudioUrl(permanentUrl);
      setError(null);
      return;
    }

    // Prioridade 2: audioUrl (media_url) do Supabase Storage
    if (audioUrl && audioUrl.includes('supabase.co/storage/v1/object/public/whatsapp-media/')) {
      console.log('✅ Using audioUrl:', audioUrl);
      setFinalAudioUrl(audioUrl);
      setError(null);
      return;
    }

    // Se não tem URL válida, mostrar erro
    console.warn('⚠️ No valid audio URL found');
    setError('Áudio não disponível');
  }, [audioUrl, permanentUrl, messageId]);

  // Gerenciar eventos do elemento de áudio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !finalAudioUrl) return;

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration);
      setIsLoading(false);
      setError(null);
      console.log('🎵 Audio ready:', { duration: audio.duration, url: finalAudioUrl });
    };

    const handleError = (e: ErrorEvent) => {
      console.error('🎵 Audio load error:', e, 'URL:', finalAudioUrl);
      setError('Erro ao carregar áudio');
      setIsLoading(false);
    };

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [finalAudioUrl]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || !finalAudioUrl) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(err => {
        console.error('🎵 Play error:', err);
        setError('Erro ao reproduzir áudio');
      });
      setIsPlaying(true);
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

  // Estados de carregamento e erro
  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 p-3 rounded-lg bg-muted ${className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <span className="text-sm text-muted-foreground">Processando áudio...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 p-3 rounded-lg bg-destructive/10 ${className}`}>
        <span className="text-sm text-destructive">{error}</span>
      </div>
    );
  }

  if (!finalAudioUrl) {
    return (
      <div className={`flex items-center gap-2 p-3 rounded-lg bg-muted ${className}`}>
        <span className="text-sm text-muted-foreground">Áudio não disponível</span>
      </div>
    );
  }

  // Renderizar player
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <audio
        ref={audioRef}
        src={finalAudioUrl}
        preload="metadata"
        crossOrigin="anonymous"
      />

      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
        <Button
          variant="ghost"
          size="sm"
          onClick={togglePlayPause}
          className="flex-shrink-0"
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>

        <div className="flex-1 flex items-center gap-2">
          <input
            type="range"
            min="0"
            max={audioDuration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 bg-primary/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatTime(currentTime)} / {formatTime(audioDuration)}
          </span>
        </div>

        <Volume2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </div>
    </div>
  );
}
