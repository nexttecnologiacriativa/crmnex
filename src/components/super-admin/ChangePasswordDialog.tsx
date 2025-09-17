
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ChangePasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (password: string) => void;
  userEmail: string;
  isLoading: boolean;
}

export default function ChangePasswordDialog({
  isOpen,
  onClose,
  onSave,
  userEmail,
  isLoading
}: ChangePasswordDialogProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSave = () => {
    if (newPassword !== confirmPassword) {
      alert('As senhas não coincidem');
      return;
    }
    
    if (newPassword.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    onSave(newPassword);
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar Senha</DialogTitle>
          <DialogDescription>
            Definir nova senha para "{userEmail}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="newPassword">Nova Senha</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Digite a nova senha"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
            />
          </div>
          
          <div>
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirme a nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isLoading || !newPassword || newPassword !== confirmPassword}
          >
            {isLoading ? 'Alterando...' : 'Alterar Senha'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
