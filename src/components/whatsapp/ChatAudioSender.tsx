import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mic, Square, Send, Play, Pause, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Limite de 15MB para áudios
const MAX_AUDIO_SIZE = 15 * 1024 * 1024;

interface AudioRecordingState {
  isRecording: boolean;
  isPlaying: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
}

interface ChatAudioSenderProps {
  selectedConv: any;
  selectedInstanceName: string;
  currentWorkspace: any;
  onAudioSent: () => void;
}

export const ChatAudioSender: React.FC<ChatAudioSenderProps> = ({
  selectedConv,
  selectedInstanceName,
  currentWorkspace,
  onAudioSent
}) => {
  const [state, setState] = useState<AudioRecordingState>({
    isRecording: false,
    isPlaying: false,
    duration: 0,
    audioBlob: null,
    audioUrl: null
  });
  const [isSending, setIsSending] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startRecording = useCallback(async () => {
    try {
      console.log('🎤 Iniciando gravação de áudio...');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Seu navegador não suporta gravação de áudio');
      }

      const audioConfigs = [
        { audio: true },
        {
          audio: {
            sampleRate: 44100,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        },
        {
          audio: {
            channelCount: 1,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        }
      ];

      let stream = null;

      for (let i = 0; i < audioConfigs.length; i++) {
        try {
          console.log(`🎤 Tentando configuração ${i + 1}:`, audioConfigs[i]);
          stream = await navigator.mediaDevices.getUserMedia(audioConfigs[i]);
          console.log('✅ Configuração funcionou');
          break;
        } catch (configError) {
          console.warn(`❌ Configuração ${i + 1} falhou:`, configError);
          if (i === audioConfigs.length - 1) {
            throw configError;
          }
        }
      }

      if (!stream) {
        throw new Error('Não foi possível acessar o microfone');
      }

      streamRef.current = stream;
      chunksRef.current = [];

      let mimeType = 'audio/wav';
      const supportedTypes = ['audio/wav', 'audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          console.log('🎵 Usando formato:', mimeType);
          break;
        }
      }

      try {
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          audioBitsPerSecond: 64000
        });
        mediaRecorderRef.current = mediaRecorder;
      } catch (recorderError) {
        console.warn('❌ Erro ao criar MediaRecorder com configurações:', recorderError);
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        console.log('✅ MediaRecorder criado com configurações padrão');
      }

      mediaRecorderRef.current.ondataavailable = event => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const finalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        if (chunksRef.current.length > 0) {
          const audioBlob = new Blob(chunksRef.current, { type: mimeType });
          const audioUrl = URL.createObjectURL(audioBlob);
          setState(prev => ({
            ...prev,
            audioBlob,
            audioUrl,
            duration: finalDuration,
            isRecording: false
          }));
        }
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      };

      mediaRecorderRef.current.start(250);
      startTimeRef.current = Date.now();
      setState(prev => ({
        ...prev,
        isRecording: true,
        duration: 0,
        audioBlob: null,
        audioUrl: null
      }));

      intervalRef.current = setInterval(() => {
        const currentDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setState(prev => ({ ...prev, duration: currentDuration }));
      }, 100);

      toast.success('Gravação iniciada');
    } catch (error: any) {
      console.error('❌ Erro ao iniciar gravação:', error);
      let errorMessage = 'Erro ao acessar microfone';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Permissão negada. Permita o acesso ao microfone e tente novamente';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Nenhum microfone encontrado. Verifique se há um microfone conectado';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Microfone em uso por outro aplicativo. Feche outros apps que usam o microfone';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Configurações de áudio não suportadas pelo seu dispositivo';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Erro de segurança. Certifique-se de estar usando HTTPS';
      }
      toast.error(errorMessage);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [state.isRecording]);

  const playAudio = useCallback(() => {
    if (!state.audioUrl) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    const audio = new Audio(state.audioUrl);
    audioRef.current = audio;
    audio.onplay = () => setState(prev => ({ ...prev, isPlaying: true }));
    audio.onended = () => setState(prev => ({ ...prev, isPlaying: false }));
    audio.onerror = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
      toast.error('Erro ao reproduzir áudio');
    };
    audio.play().catch(error => {
      console.error('Erro ao reproduzir:', error);
      toast.error('Erro ao reproduzir áudio');
    });
  }, [state.audioUrl]);

  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, []);

  const discardRecording = useCallback(() => {
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setState({
      isRecording: false,
      isPlaying: false,
      duration: 0,
      audioBlob: null,
      audioUrl: null
    });
  }, [state.audioUrl]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast.error('Selecione um arquivo de áudio válido');
      return;
    }

    // Validar tamanho (15MB)
    if (file.size > MAX_AUDIO_SIZE) {
      toast.error('Arquivo muito grande. Máximo de 15MB permitido.');
      return;
    }

    const supportedFormats = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'];
    if (!supportedFormats.includes(file.type)) {
      toast.error('Formato não suportado. Use MP3, WAV, OGG ou WebM');
      return;
    }

    const audioUrl = URL.createObjectURL(file);
    setState(prev => ({
      ...prev,
      audioBlob: file,
      audioUrl,
      duration: 0
    }));
    toast.success('Arquivo carregado com sucesso');
    event.target.value = '';
  }, []);

  const sendAudio = useCallback(async () => {
    if (!state.audioBlob || !selectedConv || !selectedInstanceName) {
      toast.error('Selecione uma conversa e uma instância Evolution');
      return;
    }

    // Validar tamanho (15MB)
    if (state.audioBlob.size > MAX_AUDIO_SIZE) {
      toast.error('Áudio muito grande. Máximo de 15MB permitido.');
      return;
    }

    const phoneToSend = selectedConv.phone_number?.replace(/\D/g, '') || '';

    try {
      setIsSending(true);
      toast.info('Enviando áudio...', { duration: 30000, id: 'audio-upload' });

      // Gerar nome único do arquivo
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const extension = state.audioBlob.type.includes('wav') ? 'wav' : 
                        state.audioBlob.type.includes('ogg') ? 'ogg' : 
                        state.audioBlob.type.includes('webm') ? 'webm' : 'mp3';
      const filename = `audio_${timestamp}_${randomId}.${extension}`;
      const path = `${currentWorkspace?.id || 'unknown'}/audio/${filename}`;

      console.log('🎵 Fazendo upload do áudio para Storage:', {
        path,
        size: state.audioBlob.size,
        type: state.audioBlob.type
      });

      // Upload direto para Supabase Storage (sem passar pela Edge Function)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('whatsapp-media')
        .upload(path, state.audioBlob, {
          contentType: state.audioBlob.type,
          cacheControl: '31536000',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      console.log('✅ Upload concluído:', uploadData);

      // Obter URL pública
      const { data: publicUrlData } = supabase.storage
        .from('whatsapp-media')
        .getPublicUrl(path);

      const audioUrl = publicUrlData.publicUrl;
      console.log('🔗 URL pública do áudio:', audioUrl);

      // Evolution API config (optional)
      const cfgRaw = currentWorkspace?.id ? localStorage.getItem(`evolution_config_${currentWorkspace.id}`) : null;
      const cfg = cfgRaw ? JSON.parse(cfgRaw) : null;

      // Enviar via sendMediaUrl (Edge Function envia apenas a URL, não o arquivo)
      const { error: sendError } = await supabase.functions.invoke('whatsapp-evolution', {
        body: {
          action: 'sendMediaUrl',
          instanceName: selectedInstanceName,
          number: phoneToSend,
          mediaUrl: audioUrl,
          mediaType: 'audio',
          fileName: filename,
          workspaceId: currentWorkspace?.id,
          apiKey: cfg?.global_api_key,
          apiUrl: cfg?.apiUrl || cfg?.api_url
        }
      });

      if (sendError) {
        throw new Error(`Erro ao enviar: ${sendError.message}`);
      }

      console.log('✅ Áudio enviado com sucesso via sendMediaUrl');

      toast.dismiss('audio-upload');
      toast.success('Áudio enviado com sucesso!');

      discardRecording();
      onAudioSent();
    } catch (error: any) {
      console.error('❌ Erro ao enviar áudio:', error);
      toast.dismiss('audio-upload');
      toast.error(`Erro ao enviar áudio: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  }, [state.audioBlob, selectedConv, selectedInstanceName, currentWorkspace, discardRecording, onAudioSent]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (state.audioUrl) {
        URL.revokeObjectURL(state.audioUrl);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [state.audioUrl]);

  // Audio recording section
  if (state.isRecording) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-sm font-medium text-red-700">
                Gravando: {formatDuration(state.duration)}
              </span>
            </div>
            <Button onClick={stopRecording} size="sm" variant="destructive" className="h-8">
              <Square className="h-3 w-3 mr-1" />
              Parar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Audio recorded section
  if (state.audioBlob && state.audioUrl) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button 
                onClick={state.isPlaying ? pauseAudio : playAudio} 
                size="sm" 
                variant="outline" 
                className="h-8 w-8 p-0"
              >
                {state.isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </Button>
              <span className="text-sm font-medium text-green-700">
                Áudio pronto ({(state.audioBlob.size / 1024 / 1024).toFixed(1)}MB)
              </span>
            </div>
            <div className="flex space-x-1">
              <Button 
                onClick={discardRecording} 
                size="sm" 
                variant="ghost" 
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
              <Button onClick={sendAudio} size="sm" className="h-8" disabled={isSending}>
                {isSending ? 'Enviando...' : (
                  <>
                    <Send className="h-3 w-3 mr-1" />
                    Enviar
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Initial state buttons
  return (
    <div className="flex gap-2">
      <Button 
        onClick={startRecording} 
        size="sm" 
        variant="outline" 
        className="flex items-center space-x-2" 
        disabled={!selectedConv || !selectedInstanceName}
      >
        <Mic className="h-4 w-4" />
        <span>Gravar</span>
      </Button>
      
      {/* Hidden file input */}
      <input 
        ref={fileInputRef} 
        type="file" 
        accept="audio/*" 
        onChange={handleFileUpload} 
        className="hidden" 
      />
    </div>
  );
};

export default ChatAudioSender;
