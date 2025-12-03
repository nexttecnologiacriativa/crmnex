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
  const [finalUrl, setFinalUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  // Determine final URL based on source
  useEffect(() => {
    if (!mediaUrl) {
      setError(true);
      setIsLoading(false);
      return;
    }

    // Reset states when URL changes
    setIsLoading(true);
    setError(false);

    // Para URLs do Supabase, usar diretamente
    if (mediaUrl.includes('supabase.co')) {
      setFinalUrl(mediaUrl);
      return;
    }

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
        } catch (err) {
          console.error('Proxy error:', err);
          setFinalUrl(mediaUrl);
        }
      };

      proxyMedia();
    } else {
      setFinalUrl(mediaUrl);
    }
  }, [mediaUrl]);

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  if (error) {
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
          src={finalUrl}
          alt={alt}
          className={cn(className, isLoading && 'hidden')}
          onClick={onClick}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            console.error('Image load error:', finalUrl);
            setError(true);
            setIsLoading(false);
          }}
        />
      )}
    </>
  );
}
