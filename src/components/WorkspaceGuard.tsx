import { ReactNode } from 'react';
import { useWorkspaceAccess } from '@/hooks/useWorkspaceAccess';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace, useCreateWorkspaceWithName } from '@/hooks/useWorkspace';
import AccountSuspendedMessage from '@/components/super-admin/AccountSuspendedMessage';
import WorkspaceOnboarding from '@/components/onboarding/WorkspaceOnboarding';

interface WorkspaceGuardProps {
  children: ReactNode;
}

export default function WorkspaceGuard({ children }: WorkspaceGuardProps) {
  const { user } = useAuth();
  const { currentWorkspace, isLoading: isLoadingWorkspace } = useWorkspace();
  const { isWorkspaceActive, isLoading: isLoadingAccess } = useWorkspaceAccess();
  const { createWorkspaceWithName, isCreating } = useCreateWorkspaceWithName();
  
  // Combinar estados de loading para garantir que ambas as queries terminaram
  const isLoading = isLoadingWorkspace || isLoadingAccess;

  console.log('WorkspaceGuard state:', { 
    user: !!user, 
    currentWorkspace: !!currentWorkspace, 
    isLoading,
    isLoadingWorkspace,
    isLoadingAccess,
    isCreating 
  });

  const handleWorkspaceCreated = (workspaceName: string) => {
    createWorkspaceWithName(workspaceName);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#003366] via-[#1e5bb8] to-[#A4D65E]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center animate-pulse border border-white/30">
            <div className="w-8 h-8 bg-white rounded-full opacity-80"></div>
          </div>
          <p className="text-white/80 text-lg">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se o usuário está autenticado mas não tem workspace, mostrar onboarding
  if (user && !currentWorkspace && !isLoading) {
    return (
      <WorkspaceOnboarding
        open={true}
        onWorkspaceCreated={handleWorkspaceCreated}
        isCreating={isCreating}
      />
    );
  }

  if (!isWorkspaceActive && currentWorkspace) {
    return (
      <AccountSuspendedMessage 
        workspaceName={currentWorkspace.name}
      />
    );
  }

  return <>{children}</>;
}
