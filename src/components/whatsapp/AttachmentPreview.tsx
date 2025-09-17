
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Send, X, FileText, Image, Video, File } from 'lucide-react';

interface AttachmentPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (caption?: string) => void;
  file: File | null;
  preview: string | null;
}

export default function AttachmentPreview({ 
  isOpen, 
  onClose, 
  onSend, 
  file, 
  preview 
}: AttachmentPreviewProps) {
  const [caption, setCaption] = useState('');

  const getFileIcon = () => {
    if (!file) return <File className="h-8 w-8" />;
    
    if (file.type.startsWith('image/')) return <Image className="h-8 w-8 text-blue-500" />;
    if (file.type.startsWith('video/')) return <Video className="h-8 w-8 text-purple-500" />;
    if (file.type.includes('pdf') || file.type.includes('document')) return <FileText className="h-8 w-8 text-red-500" />;
    
    return <File className="h-8 w-8 text-gray-500" />;
  };

  const handleSend = () => {
    onSend(caption || undefined);
    setCaption('');
  };

  if (!file) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Anexo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview do arquivo */}
          <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-lg">
            {preview && (file.type.startsWith('image/') || file.type.startsWith('video/')) ? (
              file.type.startsWith('image/') ? (
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="max-w-full max-h-48 object-contain rounded"
                />
              ) : (
                <video 
                  src={preview} 
                  className="max-w-full max-h-48 object-contain rounded"
                  controls
                />
              )
            ) : (
              <div className="flex flex-col items-center">
                {getFileIcon()}
                <p className="text-sm text-gray-600 mt-2 text-center font-medium">
                  {file.name}
                </p>
                <p className="text-xs text-gray-400">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            )}
          </div>

          {/* Campo de legenda */}
          <div>
            <Label htmlFor="caption">Legenda (opcional)</Label>
            <Textarea
              id="caption"
              placeholder="Adicione uma legenda..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSend} className="bg-green-600 hover:bg-green-700">
              <Send className="h-4 w-4 mr-2" />
              Enviar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
