
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Loader2 } from 'lucide-react';
import { useTeamManagement } from '@/hooks/useTeamManagement';
import InviteTeamMember from './InviteTeamMember';
import MembersTable from './MembersTable';
import { toast } from 'sonner';

export default function TeamManagement() {
  const {
    members,
    currentWorkspace,
    user,
    refetch,
    removeMember,
    updateRole,
    isLoading,
    error,
    currentUserRole,
  } = useTeamManagement();

  const isAllowedToManage = currentUserRole === 'admin';

  if (!currentWorkspace) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gerenciamento de Equipe
          </CardTitle>
          <CardDescription>
            Carregando workspace...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Gerenciamento de Equipe
        </CardTitle>
        <CardDescription>
          Convide e gerencie usuários do seu workspace: {currentWorkspace.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isAllowedToManage && (
          <InviteTeamMember 
            currentWorkspace={currentWorkspace}
            onMemberInvited={refetch}
          />
        )}
        
        {isLoading ? (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Carregando membros...</span>
          </div>
        ) : error ? (
          <div className="text-center p-6">
            <p className="text-red-500">Erro ao carregar membros: {error.message}</p>
            <button 
              onClick={() => refetch()} 
              className="text-blue-500 underline mt-2"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <>
            {currentUserRole && !isAllowedToManage && (
              <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md mb-4">
                Você não tem permissão para gerenciar a equipe. Apenas administradores podem fazer alterações.
              </p>
            )}
            <MembersTable
              members={members}
              currentUserId={user?.id}
              onRemoveMember={isAllowedToManage ? removeMember : () => toast.error('Apenas administradores podem remover membros.')}
              onUpdateRole={isAllowedToManage ? updateRole : () => toast.error('Apenas administradores podem alterar permissões.')}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
