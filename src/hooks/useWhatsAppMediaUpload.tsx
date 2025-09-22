import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MediaUploadResponse {
  success: boolean;
  mediaId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  mediaType: string;
  permanentUrl?: string;
}

interface MediaUploadParams {
  file: File;
  mediaType: 'image' | 'video' | 'audio' | 'document';
}

export function useWhatsAppMediaUpload() {
  return useMutation({
    mutationFn: async ({ file, mediaType }: MediaUploadParams): Promise<MediaUploadResponse> => {
      console.log('📎 Starting media upload:', { fileName: file.name, mediaType });

      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mediaType', mediaType);

      console.log('📤 Uploading to WhatsApp Media API...');

      // Upload to our edge function
      const response = await fetch(
        'https://mqotdnvwyjhyiqzbefpm.supabase.co/functions/v1/whatsapp-media-upload',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('❌ Media upload failed:', result);
        throw new Error(result.error || 'Failed to upload media');
      }

      console.log('✅ Media uploaded successfully:', result);
      return result;
    },
    onSuccess: (data) => {
      toast.success(`${data.mediaType === 'image' ? 'Imagem' : 'Arquivo'} carregado com sucesso!`);
    },
    onError: (error: any) => {
      console.error('❌ Media upload error:', error);
      toast.error(`Erro ao carregar arquivo: ${error.message}`);
    },
  });
}