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

  console.log('🖼️ WhatsAppImage render:', {
    mediaUrl,
    isSupabaseUrl: mediaUrl?.includes('supabase.co'),
    isFacebookUrl: mediaUrl?.includes('lookaside.fbsbx.com'),
    isWhatsAppUrl: mediaUrl?.includes('mmg.whatsapp.net')
  });

  // Determine final URL based on source
  useEffect(() => {
    if (!mediaUrl) return;

    // IMPORTANTE: Resetar estados quando mediaUrl muda
    setHasError(false);
    setIsLoading(true);
    setFinalUrl('');

    // Se a URL já é do Supabase, usar diretamente
    if (mediaUrl.includes('supabase.co')) {
      setFinalUrl(mediaUrl);
      return;
    }

    // Para URLs do WhatsApp (mmg.whatsapp.net) ou Facebook, usar proxy
    if (mediaUrl.includes('mmg.whatsapp.net') || 
        mediaUrl.includes('lookaside.fbsbx.com') || 
        mediaUrl.includes('scontent.')) {
      
      const proxyMedia = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            console.error('❌ No session token available for media proxy');
            setFinalUrl(mediaUrl); // Fallback to original URL
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
            // Se o proxy retorna JSON, pode ser uma URL permanente para áudio
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
              const result = await response.json();
              if (result.permanentUrl) {
                setFinalUrl(result.permanentUrl);
                return;
              }
            }

            // Para imagens, criar uma URL blob
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            blobUrlRef.current = blobUrl;
            setFinalUrl(blobUrl);
          } else {
            console.error('❌ Proxy failed, using original URL');
            setFinalUrl(mediaUrl);
          }
        } catch (error) {
          console.error('❌ Proxy error, using original URL:', error);
          setFinalUrl(mediaUrl);
        }
      };

      proxyMedia();
    } else {
      // Para outras URLs, usar diretamente
      setFinalUrl(mediaUrl);
    }
  }, [mediaUrl]);

  // Cleanup blob URLs em efeito separado
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  console.log('🔄 URL final para imagem:', { original: mediaUrl, final: finalUrl });

  return (
    <>
      {isLoading && (
        <div className={cn("animate-pulse bg-muted rounded w-full h-32", className)} />
      )}
      {hasError ? (
        <div className={cn("bg-muted rounded p-4 text-center", className)}>
          <span className="text-muted-foreground text-sm">❌ Erro ao carregar imagem</span>
        </div>
      ) : (
        finalUrl && (
          <img 
            src={finalUrl}
            alt={alt}
            className={cn(className, isLoading && 'hidden')}
            onClick={onClick}
            onError={() => {
              console.error('❌ Failed to load image:', { original: mediaUrl, final: finalUrl });
              setHasError(true);
              setIsLoading(false);
            }}
            onLoad={() => {
              console.log('✅ Image loaded successfully from URL:', { original: mediaUrl, final: finalUrl });
              setIsLoading(false);
            }}
          />
        )
      )}
    </>
  );
}