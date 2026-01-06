import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Settings2 } from 'lucide-react';

interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'user' | 'manager' | 'admin';
  joined_at: string;
  profiles: {
    email: string;
    full_name: string | null;
  } | null;
}

interface MembersTableProps {
  members: WorkspaceMember[];
  currentUserId?: string;
  onRemoveMember: (memberId: string, memberUserId: string) => void;
  onUpdateRole: (memberId: string, newRole: string) => void;
  onConfigurePermissions?: (userId: string, userName: string, role: string) => void;
}

export default function MembersTable({ 
  members, 
  currentUserId, 
  onRemoveMember, 
  onUpdateRole,
  onConfigurePermissions
}: MembersTableProps) {
  console.log('MembersTable - Rendering with members:', members);
  console.log('MembersTable - currentUserId:', currentUserId);

  // Encontrar o papel do usuário atual
  const currentUserMember = members.find(member => member.user_id === currentUserId);
  const currentUserRole = currentUserMember?.role || 'user';

  console.log('MembersTable - currentUserRole:', currentUserRole);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      default: return 'secondary';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Gerente';
      default: return 'Usuário';
    }
  };

  // Verificar se o usuário atual pode remover outro membro
  const canRemoveMember = (targetMember: WorkspaceMember) => {
    // Não pode remover a si mesmo
    if (targetMember.user_id === currentUserId) {
      return false;
    }

    // Usuários comuns não podem remover ninguém
    if (currentUserRole === 'user') {
      return false;
    }

    // Gerentes não podem remover admins
    if (currentUserRole === 'manager' && targetMember.role === 'admin') {
      return false;
    }

    // Admins podem remover qualquer um (exceto a si mesmos)
    return true;
  };

  // Verificar se o usuário atual pode alterar o papel de outro membro
  const canUpdateRole = (targetMember: WorkspaceMember) => {
    // Não pode alterar o próprio papel
    if (targetMember.user_id === currentUserId) {
      return false;
    }

    // Usuários comuns não podem alterar papéis
    if (currentUserRole === 'user') {
      return false;
    }

    // Gerentes não podem alterar papel de admins
    if (currentUserRole === 'manager' && targetMember.role === 'admin') {
      return false;
    }

    // Admins podem alterar qualquer papel (exceto o próprio)
    return true;
  };

  if (!members || members.length === 0) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-500">Nenhum membro encontrado no workspace.</p>
        <p className="text-sm text-gray-400 mt-2">
          Os membros aparecerão aqui após serem adicionados.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h4 className="font-medium mb-4">Membros do Workspace ({members.length})</h4>
      
      <div className="border rounded-md">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome Completo</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Permissão</TableHead>
            <TableHead>Entrada</TableHead>
            <TableHead className="w-20">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            console.log('Rendering member:', member);
            console.log('Can remove member:', canRemoveMember(member));
            console.log('Can update role:', canUpdateRole(member));
            
            return (
              <TableRow key={member.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-900">
                      {member.profiles?.full_name || 'Nome não informado'}
                    </span>
                    {member.user_id === currentUserId && (
                      <Badge variant="outline" className="w-fit mt-1 text-xs">Você</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-700">
                    {member.profiles?.email || 'Email não encontrado'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      {getRoleLabel(member.role)}
                    </Badge>
                    {canUpdateRole(member) && (
                      <Select
                        value={member.role}
                        onValueChange={(value) => onUpdateRole(member.id, value)}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Usuário</SelectItem>
                          <SelectItem value="manager">Gerente</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {new Date(member.joined_at).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {onConfigurePermissions && currentUserRole === 'admin' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onConfigurePermissions(
                          member.user_id, 
                          member.profiles?.full_name || 'Usuário',
                          member.role
                        )}
                        title="Configurar permissões"
                      >
                        <Settings2 className="h-3 w-3" />
                      </Button>
                    )}
                    {canRemoveMember(member) && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onRemoveMember(member.id, member.user_id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
