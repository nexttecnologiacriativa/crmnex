import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Loader2, ImageOff, RefreshCw } from 'lucide-react';

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
  const [retryCount, setRetryCount] = useState(0);
  const blobUrlRef = useRef<string | null>(null);
  const maxRetries = 2;

  const loadImage = useCallback(async (url: string, isRetry = false) => {
    if (!url) {
      setError(true);
      setIsLoading(false);
      return;
    }

    // Reset states
    setIsLoading(true);
    setError(false);

    // Cleanup previous blob URL
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    // Para URLs do Supabase Storage, usar diretamente
    if (url.includes('supabase.co/storage')) {
      console.log('📷 Loading Supabase image directly:', url);
      setFinalUrl(url);
      return;
    }

    // Para URLs do WhatsApp/Facebook, usar proxy
    if (url.includes('mmg.whatsapp.net') || 
        url.includes('lookaside.fbsbx.com') || 
        url.includes('scontent.') ||
        url.includes('.enc')) {
      
      console.log('📷 Loading via proxy:', url);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          console.warn('No auth session, trying direct URL');
          setFinalUrl(url);
          return;
        }

        const response = await fetch('https://mqotdnvwyjhyiqzbefpm.supabase.co/functions/v1/whatsapp-media-proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ url }),
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          
          // Se retornou JSON com URL permanente
          if (contentType?.includes('application/json')) {
            const result = await response.json();
            if (result.permanentUrl) {
              console.log('📷 Got permanent URL from proxy:', result.permanentUrl);
              setFinalUrl(result.permanentUrl);
              return;
            }
          }

          // Se retornou blob
          const blob = await response.blob();
          if (blob.size > 1000) {
            const blobUrl = URL.createObjectURL(blob);
            blobUrlRef.current = blobUrl;
            console.log('📷 Created blob URL:', blobUrl);
            setFinalUrl(blobUrl);
            return;
          }
        }
        
        // Fallback para URL original
        console.warn('📷 Proxy failed, using original URL');
        setFinalUrl(url);
      } catch (err) {
        console.error('📷 Proxy error:', err);
        setFinalUrl(url);
      }
    } else {
      // URL normal, usar diretamente
      setFinalUrl(url);
    }
  }, []);

  useEffect(() => {
    loadImage(mediaUrl);
  }, [mediaUrl, loadImage]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  const handleRetry = useCallback(() => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      loadImage(mediaUrl, true);
    }
  }, [retryCount, mediaUrl, loadImage]);

  const handleImageError = useCallback(() => {
    console.error('📷 Image load error:', finalUrl);
    
    // Tentar retry automático
    if (retryCount < maxRetries) {
      console.log(`📷 Auto-retry ${retryCount + 1}/${maxRetries}...`);
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        loadImage(mediaUrl, true);
      }, 1000);
    } else {
      setError(true);
      setIsLoading(false);
    }
  }, [finalUrl, retryCount, mediaUrl, loadImage]);

  if (error) {
    return (
      <div className={cn(
        "bg-muted rounded-lg p-4 flex flex-col items-center justify-center gap-2 min-h-[100px]",
        className
      )}>
        <ImageOff className="h-8 w-8 text-muted-foreground" />
        <span className="text-muted-foreground text-xs text-center">Erro ao carregar imagem</span>
        {retryCount < maxRetries && (
          <button 
            onClick={handleRetry}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <RefreshCw className="h-3 w-3" />
            Tentar novamente
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {isLoading && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center bg-muted rounded-lg",
          className
        )}>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {finalUrl && (
        <img 
          src={finalUrl}
          alt={alt}
          className={cn(
            "rounded-lg max-w-full cursor-pointer transition-opacity",
            isLoading ? 'opacity-0' : 'opacity-100',
            className
          )}
          onClick={onClick}
          onLoad={() => {
            console.log('📷 Image loaded successfully');
            setIsLoading(false);
          }}
          onError={handleImageError}
        />
      )}
    </div>
  );
}
