import { ReactNode } from 'react';
import { useWorkspaceAccess } from '@/hooks/useWorkspaceAccess';
import { useAuth } from '@/hooks/useAuth';
import { useCreateWorkspaceWithName } from '@/hooks/useWorkspace';
import AccountSuspendedMessage from '@/components/super-admin/AccountSuspendedMessage';
import WorkspaceOnboarding from '@/components/onboarding/WorkspaceOnboarding';

interface WorkspaceGuardProps {
  children: ReactNode;
}

export default function WorkspaceGuard({ children }: WorkspaceGuardProps) {
  const { user } = useAuth();
  const { isWorkspaceActive, isLoading, currentWorkspace } = useWorkspaceAccess();
  const { createWorkspaceWithName, isCreating } = useCreateWorkspaceWithName();

  const handleWorkspaceCreated = (workspaceName: string) => {
    createWorkspaceWithName(workspaceName);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
