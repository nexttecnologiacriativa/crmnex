
import { AlertTriangle, Mail, LogOut } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

interface AccountSuspendedMessageProps {
  workspaceName?: string;
  suspensionReason?: string;
}

export default function AccountSuspendedMessage({ 
  workspaceName = "este workspace", 
  suspensionReason 
}: AccountSuspendedMessageProps) {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      setTimeout(() => {
        window.location.href = '/auth';
      }, 100);
    } catch (error) {
      console.error('Error signing out:', error);
      window.location.href = '/auth';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <CardTitle className="text-red-600 text-xl">
            Workspace Suspenso
          </CardTitle>
          <CardDescription className="text-gray-600">
            O workspace "{workspaceName}" foi temporariamente suspenso e não é possível acessar o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              {suspensionReason || 'Entre em contato com nossa equipe de suporte para mais informações sobre a reativação do workspace.'}
            </p>
          </div>
          
          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.href = 'mailto:suporte@glav.com.br'}
            >
              <Mail className="h-4 w-4 mr-2" />
              Entrar em Contato
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair da Conta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
