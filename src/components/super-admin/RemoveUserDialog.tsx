
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

interface RemoveUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userEmail: string;
  isLoading: boolean;
}

export default function RemoveUserDialog({
  isOpen,
  onClose,
  onConfirm,
  userEmail,
  isLoading,
}: RemoveUserDialogProps) {
  const [confirmText, setConfirmText] = useState('');

  const handleConfirm = () => {
    if (confirmText === 'REMOVER') {
      onConfirm();
      setConfirmText('');
    }
  };

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <DialogTitle className="text-red-600">Remover Usuário</DialogTitle>
          </div>
          <DialogDescription className="text-left space-y-3">
            <p>
              Você está prestes a <strong>remover permanentemente</strong> o usuário:
            </p>
            <p className="font-semibold text-gray-900 bg-gray-100 p-2 rounded">
              {userEmail}
            </p>
            <div className="bg-red-50 border border-red-200 p-3 rounded-md">
              <p className="text-red-800 text-sm font-medium">⚠️ ATENÇÃO:</p>
              <ul className="text-red-700 text-sm mt-1 space-y-1">
                <li>• Esta ação é <strong>irreversível</strong></li>
                <li>• O usuário será removido de todos os workspaces</li>
                <li>• Todos os dados associados serão perdidos</li>
                <li>• O usuário não poderá mais fazer login</li>
              </ul>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="confirm" className="text-sm font-medium">
              Digite <span className="font-bold text-red-600">REMOVER</span> para confirmar:
            </Label>
            <Input
              id="confirm"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="REMOVER"
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={confirmText !== 'REMOVER' || isLoading}
          >
            {isLoading ? 'Removendo...' : 'Remover Usuário'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
