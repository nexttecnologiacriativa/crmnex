import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface WhatsAppImageProps {
  mediaUrl: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}

export default function WhatsAppImage({ mediaUrl, alt, className = "", onClick }: WhatsAppImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [finalUrl, setFinalUrl] = useState<string>('');
  const blobUrlRef = useRef<string | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Determine final URL based on source
  useEffect(() => {
    if (!mediaUrl) {
      setFinalUrl('');
      setIsLoading(false);
      return;
    }

    // Resetar estados
    setHasError(false);
    setIsLoading(true);

    // Limpar timeout anterior
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    // Para URLs do Supabase, usar diretamente (sem resetar finalUrl para evitar race condition)
    if (mediaUrl.includes('supabase.co')) {
      setFinalUrl(mediaUrl);
      return;
    }

    // Para outras URLs, resetar primeiro
    setFinalUrl('');

    // Para URLs do WhatsApp ou Facebook, usar proxy
    if (mediaUrl.includes('mmg.whatsapp.net') || 
        mediaUrl.includes('lookaside.fbsbx.com') || 
        mediaUrl.includes('scontent.')) {
      
      const proxyMedia = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            setFinalUrl(mediaUrl);
            return;
          }

          const response = await fetch('https://mqotdnvwyjhyiqzbefpm.supabase.co/functions/v1/whatsapp-media-proxy', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ url: mediaUrl }),
          });

          if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
              const result = await response.json();
              if (result.permanentUrl) {
                setFinalUrl(result.permanentUrl);
                return;
              }
            }

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            blobUrlRef.current = blobUrl;
            setFinalUrl(blobUrl);
          } else {
            setFinalUrl(mediaUrl);
          }
        } catch (error) {
          setFinalUrl(mediaUrl);
        }
      };

      proxyMedia();
    } else {
      setFinalUrl(mediaUrl);
    }
  }, [mediaUrl]);

  // Timeout para detectar imagens que não carregam
  useEffect(() => {
    if (finalUrl && isLoading) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn('⏰ Image loading timeout:', finalUrl);
        setIsLoading(false);
        setHasError(true);
      }, 15000);
      
      return () => {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
      };
    }
  }, [finalUrl, isLoading]);

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Renderização condicional pura
  if (!finalUrl && !isLoading) {
    return null;
  }

  if (isLoading && !finalUrl) {
    return <div className={cn("animate-pulse bg-muted rounded w-full h-32", className)} />;
  }

  if (hasError) {
    return (
      <div className={cn("bg-muted rounded p-4 text-center", className)}>
        <span className="text-muted-foreground text-sm">Erro ao carregar imagem</span>
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div className={cn("animate-pulse bg-muted rounded w-full h-32", className)} />
      )}
      {finalUrl && (
        <img 
          key={finalUrl}
          src={finalUrl}
          alt={alt}
          className={cn(className, isLoading && 'opacity-0 absolute')}
          onClick={onClick}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
          onLoad={() => {
            setIsLoading(false);
          }}
        />
      )}
    </>
  );
}