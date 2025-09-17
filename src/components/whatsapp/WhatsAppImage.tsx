import { useState } from 'react';

interface WhatsAppImageProps {
  mediaUrl: string;
  alt: string;
  className?: string;
}

export default function WhatsAppImage({ mediaUrl, alt, className = "" }: WhatsAppImageProps) {
  const [hasError, setHasError] = useState(false);

  console.log('🖼️ WhatsAppImage render:', {
    mediaUrl,
    isSupabaseUrl: mediaUrl?.includes('supabase.co'),
    isFacebookUrl: mediaUrl?.includes('lookaside.fbsbx.com')
  });

  if (hasError) {
    return (
      <div className={`bg-gray-100 rounded p-4 text-center ${className}`}>
        <span className="text-gray-500 text-sm">❌ Erro ao carregar imagem</span>
      </div>
    );
  }

  // Se a URL já é do Supabase, usar diretamente. Caso contrário, usar proxy
  const finalUrl = mediaUrl?.includes('supabase.co') 
    ? mediaUrl 
    : (mediaUrl?.includes('lookaside.fbsbx.com') || mediaUrl?.includes('scontent.'))
      ? `https://rxpaaskbhbdirlxaavsm.supabase.co/functions/v1/whatsapp-media-proxy?url=${encodeURIComponent(mediaUrl)}`
      : mediaUrl;

  console.log('🔄 URL final para imagem:', { original: mediaUrl, final: finalUrl });

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