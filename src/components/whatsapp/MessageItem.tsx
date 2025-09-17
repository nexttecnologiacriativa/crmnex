import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Check, 
  CheckCheck, 
  Clock, 
  AlertCircle, 
  Image, 
  FileText, 
  Download,
  Play,
  Pause
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  message_text: string;
  message_type: string;
  is_from_lead: boolean;
  sent_by: string | null;
  created_at: string;
  timestamp: string;
  message_id: string | null;
  status: string;
  media_url: string | null;
  media_type: string | null;
  attachment_name: string | null;
  permanent_audio_url: string | null;
  whatsapp_media_id: string | null;
}

interface MessageItemProps {
  message: WhatsAppMessage;
  isFromCurrentUser: boolean;
}

export function MessageItem({ message, isFromCurrentUser }: MessageItemProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  // 1) Escolha da URL de áudio (sempre evitar .enc)
  const preferredUrl = useMemo(() => {
    const clean = message.permanent_audio_url || message.media_url || "";
    if (!clean) return "";

    // Evitar .enc/WhatsApp direto:
    const looksEncrypted =
      clean.includes("mmg.whatsapp.net") ||
      clean.endsWith(".enc") ||
      clean.includes("/v/t62.");
    return looksEncrypted ? "" : clean;
  }, [message.media_url, message.permanent_audio_url]);

  const [effectiveUrl, setEffectiveUrl] = useState<string>(preferredUrl);

  // 2) Estados de processamento/polling e fallback
  const [isProcessing, setIsProcessing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 10;          // ~20s total com interval de 2s
  const pollingIntervalMs = 2000; // 2s

  // Usado para testar URL alternativa se a atual falhar
  const triedAltRef = useRef(false);

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'HH:mm', { locale: ptBR });
    } catch {
      return '--:--';
    }
  };

  const getStatusIcon = () => {
    if (message.is_from_lead) return null;

    switch (message.status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-muted-foreground" />;
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-destructive" />;
      default:
        return <Check className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const handleAudioPlay = () => {
    if (audioRef) {
      if (isPlaying) {
        audioRef.pause();
      } else {
        audioRef.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleAudioEnd = () => {
    setIsPlaying(false);
  };

  // 3) Realtime: assine a linha da mensagem
  useEffect(() => {
    // zera estados quando troca a mensagem
    setEffectiveUrl(preferredUrl);
    setRetryCount(0);
    triedAltRef.current = false;
  }, [message.id, preferredUrl]);

  useEffect(() => {
    if (!message?.id) return;

    const channel = supabase
      .channel(`msg-${message.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "whatsapp_messages",
          filter: `id=eq.${message.id}`,
        },
        (payload: any) => {
          const newMediaUrl = payload.new?.media_url ?? "";
          const newPermanent = payload.new?.permanent_audio_url ?? "";
          // Mesma regra de prioridade/limpeza:
          const candidate = newPermanent || newMediaUrl || "";
          const looksEncrypted =
            candidate.includes("mmg.whatsapp.net") ||
            candidate.endsWith(".enc") ||
            candidate.includes("/v/t62.");
          const next = looksEncrypted ? "" : candidate;
          if (next && next !== effectiveUrl) {
            setEffectiveUrl(next);
            setIsProcessing(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [message.id, effectiveUrl]);

  // 4) Polling (backup do realtime) até a URL limpa existir
  async function refetchMessageUrls() {
    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select("media_url, permanent_audio_url")
      .eq("id", message.id)
      .maybeSingle();

    if (error) return;

    const candidate = (data?.permanent_audio_url || data?.media_url || "") as string;
    const looksEncrypted =
      candidate.includes("mmg.whatsapp.net") ||
      candidate.endsWith(".enc") ||
      candidate.includes("/v/t62.");
    const next = looksEncrypted ? "" : candidate;

    if (next && next !== effectiveUrl) {
      setEffectiveUrl(next);
      setIsProcessing(false);
    }
  }

  useEffect(() => {
    // só faz polling se:
    // 1) é áudio
    // 2) ainda não temos URL tocável
    // 3) não estourou retries
    if (message.message_type !== "audio") return;
    if (effectiveUrl) return;

    setIsProcessing(true);

    const id = setInterval(async () => {
      if (retryCount >= maxRetries) {
        clearInterval(id);
        setIsProcessing(false);
        return;
      }
      setRetryCount((n) => n + 1);
      await refetchMessageUrls();
    }, pollingIntervalMs);

    return () => clearInterval(id);
  }, [message.message_type, effectiveUrl, retryCount]);

  // 5) Fallback automático no onError do <audio>
  function handleAudioError() {
    console.error("🎵 Falha ao tocar:", effectiveUrl);

    // tenta alternar entre media_url e permanent_audio_url uma única vez
    if (triedAltRef.current) return;
    triedAltRef.current = true;

    const alt =
      effectiveUrl === (message.permanent_audio_url || "")
        ? (message.media_url || "")
        : (message.permanent_audio_url || "");

    const looksEncrypted =
      alt.includes("mmg.whatsapp.net") || alt.endsWith(".enc") || alt.includes("/v/t62.");

    if (!looksEncrypted && alt) {
      setEffectiveUrl(alt);
    }
  }

  const renderMessageContent = () => {
    switch (message.message_type) {
      case 'text':
        return (
          <div className="whitespace-pre-wrap break-words">
            {message.message_text}
          </div>
        );

      case 'image':
        return (
          <div className="space-y-2">
            {message.media_url && (
              <div className="relative max-w-xs">
                <img
                  src={message.media_url}
                  alt="Imagem compartilhada"
                  className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(message.media_url!, '_blank')}
                  onError={(e) => {
                    console.error('Erro ao carregar imagem:', message.media_url);
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2 opacity-70 hover:opacity-100"
                  onClick={() => window.open(message.media_url!, '_blank')}
                >
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            )}
            {message.message_text && message.message_text !== 'Imagem' && (
              <div className="text-sm">
                {message.message_text}
              </div>
            )}
          </div>
        );

      case 'audio':
      case 'video':
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            Tipo de mensagem não suportada no momento
          </div>
        );

      case 'document':
        return (
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
            <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {message.attachment_name || message.message_text || 'Documento'}
              </p>
              <p className="text-xs text-muted-foreground">
                {message.media_type || 'Arquivo'}
              </p>
            </div>
            {message.media_url && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(message.media_url!, '_blank')}
                className="flex-shrink-0"
              >
                <Download className="h-3 w-3" />
              </Button>
            )}
          </div>
        );

      default:
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            Tipo de mensagem não suportado
          </div>
        );
    }
  };

  return (
    <div className={cn(
      "flex w-full mb-1",
      isFromCurrentUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-xs lg:max-w-md",
        isFromCurrentUser ? "ml-auto" : "mr-auto"
      )}>
        <div className={cn(
          "rounded-lg px-3 py-2 text-sm",
          isFromCurrentUser 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted"
        )}>
          {renderMessageContent()}
          
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className={cn(
              "text-xs opacity-70"
            )}>
              {formatTime(message.created_at)}
            </span>
            {getStatusIcon()}
          </div>
        </div>
      </div>
    </div>
  );
}