import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WorkspaceOnboardingProps {
  open: boolean;
  onWorkspaceCreated: (workspaceName: string) => void;
  isCreating: boolean;
}

export default function WorkspaceOnboarding({ 
  open, 
  onWorkspaceCreated,
  isCreating 
}: WorkspaceOnboardingProps) {
  const [workspaceName, setWorkspaceName] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workspaceName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, informe o nome do seu workspace.',
        variant: 'destructive',
      });
      return;
    }

    onWorkspaceCreated(workspaceName.trim());
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md" 
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-3">
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <DialogTitle className="text-2xl text-center">
            Bem-vindo ao NexCRM!
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Vamos começar criando o seu primeiro workspace. Este será o espaço onde você gerenciará seus leads, pipelines e equipe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">
              Nome do Workspace
            </Label>
            <Input
              id="workspace-name"
              placeholder="Ex: Minha Empresa"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              disabled={isCreating}
              autoFocus
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              Você poderá alterar esse nome depois nas configurações.
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isCreating || !workspaceName.trim()}
            size="lg"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando workspace...
              </>
            ) : (
              'Criar Workspace'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
