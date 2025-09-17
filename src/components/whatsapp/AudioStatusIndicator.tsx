import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AudioStatusIndicatorProps {
  messageId: string;
  status: 'sent' | 'failed' | 'processing';
  permanentAudioUrl?: string | null;
  onReprocess?: () => void;
}

export const AudioStatusIndicator: React.FC<AudioStatusIndicatorProps> = ({
  messageId,
  status,
  permanentAudioUrl,
  onReprocess
}) => {
  const handleReprocessAudio = async () => {
    try {
      toast.info('Reprocessando áudio...');
      
      const { error } = await supabase.functions.invoke('whatsapp-audio-processor', {
        body: { 
          messageId,
          forceReprocess: true 
        }
      });
      
      if (error) {
        throw error;
      }
      
      toast.success('Áudio reprocessado com sucesso!');
      onReprocess?.();
      
    } catch (error: any) {
      console.error('❌ Erro ao reprocessar áudio:', error);
      toast.error('Erro ao reprocessar áudio: ' + error.message);
    }
  };

  if (status === 'processing') {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Processando...
      </Badge>
    );
  }

  if (status === 'failed') {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Falhou
        </Badge>
        <Button
          onClick={handleReprocessAudio}
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (status === 'sent' && permanentAudioUrl) {
    return (
      <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Processado
      </Badge>
    );
  }

  return null;
};

export default AudioStatusIndicator;