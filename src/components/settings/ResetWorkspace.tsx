
import { useState } from 'react';
import { useWorkspaceReset } from '@/hooks/useWorkspaceReset';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { AlertDialogCancel } from '@radix-ui/react-alert-dialog';

interface ResetWorkspaceProps {
  currentUserRole?: string;
}

export default function ResetWorkspace({ currentUserRole }: ResetWorkspaceProps) {
  const { resetWorkspace, isResetting, currentWorkspace } = useWorkspaceReset();
  const [confirmationText, setConfirmationText] = useState('');
  const [isSecondStep, setIsSecondStep] = useState(false);
  const [open, setOpen] = useState(false);

  const CONFIRMATION_WORD = 'ZERAR';

  if (currentUserRole !== 'admin') {
    return null;
  }

  const handleReset = async () => {
    if (!currentWorkspace) return;
    await resetWorkspace(currentWorkspace.id);
    handleClose();
  };
  
  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setIsSecondStep(false);
      setConfirmationText('');
    }, 300);
  }

  return (
    <Card className="mt-6 border-red-500">
      <CardHeader>
        <CardTitle className="text-red-600 flex items-center gap-2">
          <AlertTriangle />
          Zona de Perigo
        </CardTitle>
        <CardDescription className="text-red-500">
          Ações destrutivas que não podem ser desfeitas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Zerar Workspace</h3>
            <p className="text-sm text-gray-600">
              Isso removerá todos os leads, tarefas, jobs e outras configurações,
              restaurando o workspace para o estado inicial.
              <strong className="block">Os usuários não serão removidos.</strong>
            </p>
          </div>
          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Zerar Workspace</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              {!isSecondStep ? (
                <>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação é irreversível. Todos os dados (leads, tarefas, jobs, etc.) serão
                      permanentemente apagados. Os usuários e suas permissões serão mantidos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleClose}>Cancelar</AlertDialogCancel>
                    <Button
                      variant="destructive"
                      onClick={() => setIsSecondStep(true)}
                    >
                      Eu entendo, continuar
                    </Button>
                  </AlertDialogFooter>
                </>
              ) : (
                <>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmação Final</AlertDialogTitle>
                    <AlertDialogDescription>
                      Para confirmar, por favor, digite <strong>{CONFIRMATION_WORD}</strong> no campo abaixo.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="my-4">
                    <Label htmlFor="confirmation">Digite {CONFIRMATION_WORD}</Label>
                    <Input
                      id="confirmation"
                      value={confirmationText}
                      onChange={(e) => setConfirmationText(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleClose}>Cancelar</AlertDialogCancel>
                    <Button
                      variant="destructive"
                      onClick={handleReset}
                      disabled={confirmationText !== CONFIRMATION_WORD || isResetting}
                    >
                      {isResetting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Zerando...
                        </>
                      ) : (
                        'Zerar permanentemente'
                      )}
                    </Button>
                  </AlertDialogFooter>
                </>
              )}
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
