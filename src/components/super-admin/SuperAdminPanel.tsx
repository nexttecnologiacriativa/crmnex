
import { useState, useEffect } from 'react';
import { Shield, Users, AlertTriangle, CheckCircle, XCircle, Calendar, Search, Settings, Key, BarChart3, UserCheck, UserX } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import WorkspaceLimitsDialog from './WorkspaceLimitsDialog';
import ChangePasswordDialog from './ChangePasswordDialog';
import RemoveUserDialog from './RemoveUserDialog';

export default function SuperAdminPanel() {
  const { 
    isSuperAdmin, 
    workspaces, 
    loadingWorkspaces, 
    error,
    suspendAccount, 
    activateAccount,
    removeUser,
    changeUserPassword,
    updateWorkspaceLimits,
    isLoading 
  } = useSuperAdmin();
  
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [limitsDialogOpen, setLimitsDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [removeUserDialogOpen, setRemoveUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string } | null>(null);
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set());

  // Debug effect para monitorar mudanças nos workspaces
  useEffect(() => {
    console.log('SuperAdminPanel - workspaces updated:', workspaces.length);
    console.log('Workspaces:', workspaces);
    
    // Verificar se ainda existe algum usuário com email icandaybr@gmail.com
    const problematicUsers = workspaces.flatMap(workspace => 
      workspace.workspace_members.filter(member => 
        member.profiles?.email === 'icandaybr@gmail.com'
      )
    );
    
    if (problematicUsers.length > 0) {
      console.error('⚠️ STILL FOUND PROBLEMATIC USERS:', problematicUsers);
    } else {
      console.log('✅ No problematic users found in current workspace data');
    }
  }, [workspaces]);

  console.log('SuperAdminPanel - isSuperAdmin:', isSuperAdmin);
  console.log('SuperAdminPanel - workspaces:', workspaces);
  console.log('SuperAdminPanel - loadingWorkspaces:', loadingWorkspaces);
  console.log('SuperAdminPanel - error:', error);

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Acesso Negado</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar este painel.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const filteredWorkspaces = workspaces.filter(workspace =>
    workspace.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workspace.id.includes(searchTerm) ||
    workspace.workspace_members.some(member => 
      member.profiles.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.profiles.full_name && member.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  );

  const activeWorkspaces = workspaces.filter(w => w.is_active).length;
  const suspendedWorkspaces = workspaces.filter(w => !w.is_active).length;
  const totalUsers = workspaces.reduce((acc, w) => acc + w.workspace_members.length, 0);

  const toggleWorkspaceExpanded = (workspaceId: string) => {
    const newExpanded = new Set(expandedWorkspaces);
    if (newExpanded.has(workspaceId)) {
      newExpanded.delete(workspaceId);
    } else {
      newExpanded.add(workspaceId);
    }
    setExpandedWorkspaces(newExpanded);
  };

  const handleSuspend = async (workspaceId: string) => {
    await suspendAccount.mutateAsync({ 
      workspaceId, 
      reason: suspendReason || undefined 
    });
    setSuspendReason('');
    setSelectedWorkspace(null);
  };

  const handleActivate = async (workspaceId: string) => {
    await activateAccount.mutateAsync(workspaceId);
  };

  const handleUpdateLimits = async (limits: { maxLeads: number | null; maxTasks: number | null; maxJobs: number | null }) => {
    if (!selectedWorkspace) return;
    
    await updateWorkspaceLimits.mutateAsync({
      workspaceId: selectedWorkspace,
      maxLeads: limits.maxLeads,
      maxTasks: limits.maxTasks,
      maxJobs: limits.maxJobs,
    });
  };

  const handleChangePassword = async (newPassword: string) => {
    if (!selectedUser) return;
    
    await changeUserPassword.mutateAsync({
      userId: selectedUser.id,
      newPassword,
    });
  };

  const handleRemoveUser = async () => {
    if (!selectedUser) return;
    
    console.log('Removing user from panel:', selectedUser);
    
    await removeUser.mutateAsync({
      userId: selectedUser.id,
      userEmail: selectedUser.email,
    });
    
    setRemoveUserDialogOpen(false);
    setSelectedUser(null);
    
    // Forçar refresh adicional após 1 segundo
    setTimeout(() => {
      console.log('Force refreshing workspace data...');
      queryClient.invalidateQueries({ queryKey: ['all-workspaces-with-details'] });
    }, 1000);
  };

  if (error) {
    console.error('Error in SuperAdminPanel:', error);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Painel Super Administrador
            </h1>
          </div>
          <p className="text-gray-600">
            Gerencie contas, usuários e limites do sistema
          </p>
          {/* Debug info */}
          <div className="mt-2 text-xs text-gray-500">
            Debug: {workspaces.length} workspaces carregados | Loading: {loadingWorkspaces ? 'Sim' : 'Não'}
            {error && <span className="text-red-500"> | Erro: {error.message}</span>}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Contas</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workspaces.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contas Ativas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeWorkspaces}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contas Suspensas</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{suspendedWorkspaces}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <UserCheck className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{totalUsers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Gestão de Contas e Usuários</CardTitle>
                <CardDescription>
                  Lista completa de workspaces e usuários ({workspaces.length} workspaces encontrados)
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Buscar por nome, ID ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingWorkspaces ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <span className="ml-2">Carregando dados...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center p-8 text-red-600">
                <AlertTriangle className="h-6 w-6 mr-2" />
                Erro ao carregar dados: {error.message}
              </div>
            ) : workspaces.length === 0 ? (
              <div className="flex items-center justify-center p-8 text-gray-500">
                <Users className="h-6 w-6 mr-2" />
                Nenhum workspace encontrado no sistema
              </div>
            ) : (
              <div className="space-y-4">
                {filteredWorkspaces.map((workspace) => (
                  <Collapsible
                    key={workspace.id}
                    open={expandedWorkspaces.has(workspace.id)}
                    onOpenChange={() => toggleWorkspaceExpanded(workspace.id)}
                  >
                    <div className="border rounded-lg p-4">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-left">
                              <div className="font-semibold text-lg">{workspace.name}</div>
                              <div className="text-sm text-gray-500">
                                ID: {workspace.id.slice(0, 8)}... • {workspace.workspace_members?.length || 0} usuário(s)
                              </div>
                              {workspace.workspace_members && workspace.workspace_members.length > 0 && (
                                <div className="text-sm text-gray-600 mt-1">
                                  <div className="space-y-1">
                                    {workspace.workspace_members.map((member, index) => (
                                      <div key={member.id} className="flex items-center gap-2">
                                        <span className="font-medium">
                                          {member.profiles?.full_name || 'Nome não informado'}
                                        </span>
                                        <span className="text-gray-500">
                                          ({member.profiles?.email || 'Email não encontrado'})
                                        </span>
                                        {index < workspace.workspace_members.length - 1 && <span className="text-gray-400">•</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <Badge 
                              variant={workspace.is_active ? "default" : "destructive"}
                              className={workspace.is_active ? "bg-green-100 text-green-800" : ""}
                            >
                              {workspace.is_active ? 'Ativa' : 'Suspensa'}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {workspace.usage && (
                              <div className="text-right text-sm text-gray-600 mr-4">
                                <div>L: {workspace.usage.leads_count} | T: {workspace.usage.tasks_count} | J: {workspace.usage.jobs_count}</div>
                                <div className="text-xs">
                                  Limite: {workspace.workspace_limits?.max_leads || '∞'} | {workspace.workspace_limits?.max_tasks || '∞'} | {workspace.workspace_limits?.max_jobs || '∞'}
                                </div>
                              </div>
                            )}
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedWorkspace(workspace.id);
                                setLimitsDialogOpen(true);
                              }}
                            >
                              <BarChart3 className="h-4 w-4" />
                            </Button>

                            {workspace.is_active ? (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedWorkspace(workspace.id);
                                    }}
                                  >
                                    Suspender
                                  </Button>
                                </DialogTrigger>
                                <DialogContent onClick={(e) => e.stopPropagation()}>
                                  <DialogHeader>
                                    <DialogTitle>Suspender Conta</DialogTitle>
                                    <DialogDescription>
                                      Tem certeza que deseja suspender a conta "{workspace.name}"?
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label htmlFor="reason">Motivo da Suspensão (opcional)</Label>
                                      <Textarea
                                        id="reason"
                                        placeholder="Digite o motivo da suspensão..."
                                        value={suspendReason}
                                        onChange={(e) => setSuspendReason(e.target.value)}
                                      />
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      variant="destructive"
                                      onClick={() => handleSuspend(workspace.id)}
                                      disabled={isLoading}
                                    >
                                      {isLoading ? 'Suspendendo...' : 'Confirmar Suspensão'}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            ) : (
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleActivate(workspace.id);
                                }}
                                disabled={isLoading}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {isLoading ? 'Ativando...' : 'Ativar'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="mt-4 pt-4 border-t">
                          <h4 className="font-medium mb-3">
                            Detalhes dos Usuários ({workspace.workspace_members?.length || 0}):
                          </h4>
                          {!workspace.workspace_members || workspace.workspace_members.length === 0 ? (
                            <p className="text-gray-500 text-sm">Nenhum usuário encontrado neste workspace</p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nome da Pessoa</TableHead>
                                  <TableHead>Email</TableHead>
                                  <TableHead>Nome do Workspace</TableHead>
                                  <TableHead>Cargo</TableHead>
                                  <TableHead>Data de Entrada</TableHead>
                                  <TableHead>Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {workspace.workspace_members.map((member) => (
                                  <TableRow key={member.id}>
                                    <TableCell className="font-medium">
                                      {member.profiles?.full_name || 'Nome não informado'}
                                    </TableCell>
                                    <TableCell>
                                      {member.profiles?.email || 'Email não encontrado'}
                                    </TableCell>
                                    <TableCell className="font-medium text-blue-600">
                                      {workspace.name}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline">
                                        {member.role}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4 text-gray-500" />
                                        {new Date(member.joined_at).toLocaleDateString('pt-BR')}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setSelectedUser({
                                              id: member.user_id,
                                              email: member.profiles?.email || 'Email não encontrado'
                                            });
                                            setPasswordDialogOpen(true);
                                          }}
                                          title="Alterar senha"
                                        >
                                          <Key className="h-4 w-4" />
                                        </Button>
                                        
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => {
                                            console.log('Clicando para remover usuário:', member.user_id, member.profiles?.email);
                                            setSelectedUser({
                                              id: member.user_id,
                                              email: member.profiles?.email || 'Email não encontrado'
                                            });
                                            setRemoveUserDialogOpen(true);
                                          }}
                                          title="Remover usuário"
                                        >
                                          <UserX className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                          
                          {workspace.account_status?.suspension_reason && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                              <strong>Motivo da suspensão:</strong> {workspace.account_status.suspension_reason}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialogs */}
        <WorkspaceLimitsDialog
          isOpen={limitsDialogOpen}
          onClose={() => {
            setLimitsDialogOpen(false);
            setSelectedWorkspace(null);
          }}
          onSave={handleUpdateLimits}
          currentLimits={selectedWorkspace ? workspaces.find(w => w.id === selectedWorkspace)?.workspace_limits : undefined}
          workspaceName={selectedWorkspace ? workspaces.find(w => w.id === selectedWorkspace)?.name || '' : ''}
          usage={selectedWorkspace ? workspaces.find(w => w.id === selectedWorkspace)?.usage : undefined}
          isLoading={isLoading}
        />

        <ChangePasswordDialog
          isOpen={passwordDialogOpen}
          onClose={() => {
            setPasswordDialogOpen(false);
            setSelectedUser(null);
          }}
          onSave={handleChangePassword}
          userEmail={selectedUser?.email || ''}
          isLoading={isLoading}
        />

        <RemoveUserDialog
          isOpen={removeUserDialogOpen}
          onClose={() => {
            setRemoveUserDialogOpen(false);
            setSelectedUser(null);
          }}
          onConfirm={handleRemoveUser}
          userEmail={selectedUser?.email || ''}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
