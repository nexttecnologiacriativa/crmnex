
import { ReactNode } from 'react';
import { useWorkspaceAccess } from '@/hooks/useWorkspaceAccess';
import AccountSuspendedMessage from '@/components/super-admin/AccountSuspendedMessage';

interface WorkspaceGuardProps {
  children: ReactNode;
}

export default function WorkspaceGuard({ children }: WorkspaceGuardProps) {
  const { isWorkspaceActive, isLoading, currentWorkspace } = useWorkspaceAccess();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
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
