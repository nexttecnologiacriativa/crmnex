import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface WhatsAppVideoProps {
  mediaUrl: string;
  className?: string;
  alt?: string;
  onClick?: () => void;
}

export default function WhatsAppVideo({ 
  mediaUrl, 
  className, 
  alt = 'Vídeo compartilhado',
  onClick 
}: WhatsAppVideoProps) {
  const [finalUrl, setFinalUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const loadVideo = async () => {
      setIsLoading(true);
      setError(false);

      // Se a URL já é do Supabase Storage, usar diretamente
      if (mediaUrl.includes('supabase.co/storage')) {
        setFinalUrl(mediaUrl);
        setIsLoading(false);
        return;
      }

      // Para URLs do WhatsApp/Facebook, usar o proxy
      if (mediaUrl.includes('mmg.whatsapp.net') || 
          mediaUrl.includes('lookaside.fbsbx.com') ||
          mediaUrl.includes('scontent')) {
        
        try {
          const { data, error: proxyError } = await supabase.functions.invoke('whatsapp-media-proxy', {
            body: { url: mediaUrl }
          });

          if (proxyError) {
            console.error('Erro ao fazer proxy do vídeo:', proxyError);
            setError(true);
            setIsLoading(false);
            return;
          }

          // Se o proxy retornou um blob
          if (data) {
            const blob = new Blob([data], { type: 'video/mp4' });
            const blobUrl = URL.createObjectURL(blob);
            blobUrlRef.current = blobUrl;
            setFinalUrl(blobUrl);
          }
        } catch (err) {
          console.error('Erro ao carregar vídeo via proxy:', err);
          setError(true);
        }
      } else {
        // Para outras URLs públicas, tentar usar diretamente
        setFinalUrl(mediaUrl);
      }

      setIsLoading(false);
    };

    loadVideo();

    // Cleanup: liberar blob URL quando componente desmontar
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, [mediaUrl]);

  if (error) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-muted rounded-lg",
        className
      )}>
        <div className="text-center p-4">
          <p className="text-sm text-muted-foreground">
            Erro ao carregar vídeo
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div className={cn(
          "flex items-center justify-center bg-muted rounded-lg animate-pulse",
          className,
          "h-48"
        )}>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {finalUrl && (
        <video
          src={finalUrl}
          controls
          className={cn(className, isLoading && 'hidden')}
          onLoadedData={() => setIsLoading(false)}
          onClick={onClick}
          style={{ maxHeight: '300px' }}
        />
      )}
    </>
  );
}
