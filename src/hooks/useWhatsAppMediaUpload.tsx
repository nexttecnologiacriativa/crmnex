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

      // Get workspace ID
      const { data: workspaceMember } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!workspaceMember) {
        throw new Error('No workspace found');
      }

      // Convert file to base64
      const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
      };

      console.log('📤 Converting file to base64...');
      const fileData = await fileToBase64(file);

      console.log('📤 Uploading to WhatsApp Media API...');

      // Upload to our edge function with base64
      const { data: result, error } = await supabase.functions.invoke('whatsapp-media-upload', {
        body: {
          fileData,
          mimeType: file.type,
          filename: file.name,
          workspaceId: workspaceMember.workspace_id
        }
      });

      if (error || !result?.success) {
        console.error('❌ Media upload failed:', error || result);
        throw new Error(error?.message || result?.error || 'Failed to upload media');
      }

      console.log('✅ Media uploaded successfully:', result);
      
      // Return in expected format
      return {
        success: true,
        mediaId: result.path.split('/').pop() || '',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        mediaType,
        permanentUrl: result.publicUrl
      };
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