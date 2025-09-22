import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WhatsAppImageProps {
  mediaUrl: string;
  alt: string;
  className?: string;
}

export default function WhatsAppImage({ mediaUrl, alt, className = "" }: WhatsAppImageProps) {
  const [hasError, setHasError] = useState(false);
  const [finalUrl, setFinalUrl] = useState<string>('');

  console.log('🖼️ WhatsAppImage render:', {
    mediaUrl,
    isSupabaseUrl: mediaUrl?.includes('supabase.co'),
    isFacebookUrl: mediaUrl?.includes('lookaside.fbsbx.com'),
    isWhatsAppUrl: mediaUrl?.includes('mmg.whatsapp.net')
  });

  // Determine final URL based on source
  useEffect(() => {
    if (!mediaUrl) return;

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

    // Cleanup blob URLs
    return () => {
      if (finalUrl.startsWith('blob:')) {
        URL.revokeObjectURL(finalUrl);
      }
    };
  }, [mediaUrl, finalUrl]);

  console.log('🔄 URL final para imagem:', { original: mediaUrl, final: finalUrl });

  if (hasError) {
    return (
      <div className={`bg-gray-100 rounded p-4 text-center ${className}`}>
        <span className="text-gray-500 text-sm">❌ Erro ao carregar imagem</span>
      </div>
    );
  }

  return (
    <img 
      src={finalUrl}
      alt={alt}
      className={className}
      onError={(e) => {
        console.error('❌ Failed to load image:', { original: mediaUrl, final: finalUrl });
        setHasError(true);
      }}
      onLoad={() => console.log('✅ Image loaded successfully from URL:', { original: mediaUrl, final: finalUrl })}
    />
  );
}