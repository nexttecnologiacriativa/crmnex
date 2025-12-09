
import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import WorkspaceGuard from '@/components/WorkspaceGuard';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
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

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Verificar se o usuário precisa redefinir a senha
  // Só redireciona se NÃO estiver já na página de reset
  if (profile?.password_reset_required && location.pathname !== '/force-password-reset') {
    return <Navigate to="/force-password-reset" replace />;
  }

  return (
    <WorkspaceGuard>
      {children}
    </WorkspaceGuard>
  );
}
