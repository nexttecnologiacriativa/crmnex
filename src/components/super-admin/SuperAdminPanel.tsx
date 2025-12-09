
import { useState, useEffect } from 'react';
import { Shield, Users, AlertTriangle, CheckCircle, XCircle, Calendar, Search, Settings, Key, BarChart3, UserCheck, UserX, RotateCcw, Building2, ChevronDown, Smartphone, TrendingUp, Crown, Zap } from 'lucide-react';
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
import { AvatarInitials } from '@/components/ui/avatar-initials';

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
    forcePasswordReset,
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

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-96 border-destructive/50 shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Acesso Negado</CardTitle>
            <CardDescription className="text-muted-foreground">
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
      email: selectedUser.email,
      newPassword,
    });
  };

  const handleForcePasswordReset = async (email: string) => {
    await forcePasswordReset.mutateAsync({ email });
  };

  const handleRemoveUser = async () => {
    if (!selectedUser) return;
    
    await removeUser.mutateAsync({
      userId: selectedUser.id,
      userEmail: selectedUser.email,
    });
    
    setRemoveUserDialogOpen(false);
    setSelectedUser(null);
    
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['all-workspaces-with-details'] });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-2xl gradient-purple p-8 shadow-2xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L2c+PC9zdmc+')] opacity-30"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Super Admin Panel
                </h1>
                <p className="text-white/80 text-sm mt-1">
                  Gerencie contas, usuários e limites do sistema
                </p>
              </div>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-white/10 blur-2xl"></div>
          <div className="absolute right-20 top-0 w-20 h-20 rounded-full bg-white/10 blur-xl"></div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Accounts */}
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
            <div className="absolute inset-0 gradient-purple opacity-90"></div>
            <CardContent className="relative z-10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">Total de Contas</p>
                  <p className="text-4xl font-bold text-white mt-2">{workspaces.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform">
                  <Building2 className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-white/70 text-xs">
                <TrendingUp className="h-3 w-3" />
                <span>Workspaces registrados</span>
              </div>
            </CardContent>
          </Card>

          {/* Active Accounts */}
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
            <div className="absolute inset-0 gradient-green opacity-90"></div>
            <CardContent className="relative z-10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">Contas Ativas</p>
                  <p className="text-4xl font-bold text-white mt-2">{activeWorkspaces}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform">
                  <CheckCircle className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-white/70 text-xs">
                <Zap className="h-3 w-3" />
                <span>Operando normalmente</span>
              </div>
            </CardContent>
          </Card>

          {/* Suspended Accounts */}
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
            <div className="absolute inset-0 gradient-orange opacity-90"></div>
            <CardContent className="relative z-10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">Contas Suspensas</p>
                  <p className="text-4xl font-bold text-white mt-2">{suspendedWorkspaces}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform">
                  <XCircle className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-white/70 text-xs">
                <AlertTriangle className="h-3 w-3" />
                <span>Aguardando ação</span>
              </div>
            </CardContent>
          </Card>

          {/* Total Users */}
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
            <div className="absolute inset-0 gradient-blue opacity-90"></div>
            <CardContent className="relative z-10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">Total de Usuários</p>
                  <p className="text-4xl font-bold text-white mt-2">{totalUsers}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform">
                  <Users className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-white/70 text-xs">
                <UserCheck className="h-3 w-3" />
                <span>Usuários cadastrados</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Workspaces List */}
        <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  Gestão de Contas
                </CardTitle>
                <CardDescription className="mt-1">
                  {workspaces.length} workspaces encontrados
                </CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar workspace, usuário ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-80 bg-background/50 border-border/50 focus:border-primary"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingWorkspaces ? (
              <div className="flex flex-col items-center justify-center p-12">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                  <Shield className="absolute inset-0 m-auto h-6 w-6 text-primary" />
                </div>
                <span className="mt-4 text-muted-foreground">Carregando dados...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center p-12 text-destructive">
                <div className="p-4 rounded-full bg-destructive/10 mb-4">
                  <AlertTriangle className="h-8 w-8" />
                </div>
                <p className="font-medium">Erro ao carregar dados</p>
                <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
              </div>
            ) : workspaces.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <Building2 className="h-8 w-8" />
                </div>
                <p className="font-medium">Nenhum workspace encontrado</p>
                <p className="text-sm mt-1">O sistema não possui workspaces cadastrados</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredWorkspaces.map((workspace, index) => (
                  <Collapsible
                    key={workspace.id}
                    open={expandedWorkspaces.has(workspace.id)}
                    onOpenChange={() => toggleWorkspaceExpanded(workspace.id)}
                  >
                    <div 
                      className="border border-border/50 rounded-xl overflow-hidden bg-gradient-to-r from-background to-muted/20 hover:shadow-lg transition-all duration-300 animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <CollapsibleTrigger className="w-full">
                        <div className="p-5 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${workspace.is_active ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                              <Building2 className={`h-6 w-6 ${workspace.is_active ? 'text-primary' : 'text-destructive'}`} />
                            </div>
                            <div className="text-left">
                              <div className="flex items-center gap-3">
                                <h3 className="font-semibold text-lg">{workspace.name}</h3>
                                <Badge 
                                  variant={workspace.is_active ? "default" : "destructive"}
                                  className={`${workspace.is_active 
                                    ? 'bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20' 
                                    : 'bg-destructive/10 text-destructive border-destructive/30'
                                  } transition-colors`}
                                >
                                  {workspace.is_active ? '● Ativa' : '○ Suspensa'}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {workspace.workspace_members?.length || 0} usuário(s) • ID: {workspace.id.slice(0, 8)}...
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {/* Stats badges */}
                            {workspace.usage && (
                              <div className="hidden lg:flex items-center gap-3">
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                  <TrendingUp className="h-4 w-4 text-blue-500" />
                                  <span className="font-semibold text-blue-600">{workspace.usage.leads_count?.toLocaleString() || 0}</span>
                                  <span className="text-xs text-blue-500/80">leads</span>
                                </div>
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                                  workspace.usage.whatsapp_connected_count > 0 
                                    ? 'bg-green-500/10 border border-green-500/20' 
                                    : 'bg-muted border border-border/50'
                                }`}>
                                  <Smartphone className={`h-4 w-4 ${workspace.usage.whatsapp_connected_count > 0 ? 'text-green-500' : 'text-muted-foreground'}`} />
                                  <span className={`font-semibold ${workspace.usage.whatsapp_connected_count > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                                    {workspace.usage.whatsapp_connected_count}/{workspace.usage.whatsapp_instances_count}
                                  </span>
                                  <span className={`text-xs ${workspace.usage.whatsapp_connected_count > 0 ? 'text-green-500/80' : 'text-muted-foreground'}`}>WhatsApp</span>
                                </div>
                              </div>
                            )}
                            
                            {/* Action buttons */}
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 w-9 p-0 border-border/50 hover:border-primary hover:bg-primary/5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedWorkspace(workspace.id);
                                  setLimitsDialogOpen(true);
                                }}
                                title="Gerenciar limites"
                              >
                                <BarChart3 className="h-4 w-4" />
                              </Button>

                              {workspace.is_active ? (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="destructive" 
                                      size="sm"
                                      className="h-9 px-4"
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
                                  size="sm"
                                  className="h-9 px-4 bg-green-600 hover:bg-green-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleActivate(workspace.id);
                                  }}
                                  disabled={isLoading}
                                >
                                  {isLoading ? 'Ativando...' : 'Ativar'}
                                </Button>
                              )}
                              
                              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${expandedWorkspaces.has(workspace.id) ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="border-t border-border/50 bg-muted/30 p-5">
                          <h4 className="font-medium mb-4 flex items-center gap-2 text-foreground">
                            <Users className="h-4 w-4 text-primary" />
                            Usuários do Workspace ({workspace.workspace_members?.length || 0})
                          </h4>
                          {!workspace.workspace_members || workspace.workspace_members.length === 0 ? (
                            <p className="text-muted-foreground text-sm italic">Nenhum usuário encontrado</p>
                          ) : (
                            <div className="rounded-lg border border-border/50 overflow-hidden bg-background">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableHead className="font-semibold">Usuário</TableHead>
                                    <TableHead className="font-semibold">Email</TableHead>
                                    <TableHead className="font-semibold">Cargo</TableHead>
                                    <TableHead className="font-semibold">Entrada</TableHead>
                                    <TableHead className="font-semibold text-right">Ações</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {workspace.workspace_members.map((member, idx) => (
                                    <TableRow 
                                      key={member.id}
                                      className={`${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'} hover:bg-accent/50 transition-colors`}
                                    >
                                      <TableCell>
                                        <div className="flex items-center gap-3">
                                          <AvatarInitials 
                                            name={member.profiles?.full_name || member.profiles?.email || 'U'} 
                                            className="h-9 w-9 text-sm"
                                          />
                                          <span className="font-medium">
                                            {member.profiles?.full_name || 'Nome não informado'}
                                          </span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-muted-foreground">
                                        {member.profiles?.email || 'Email não encontrado'}
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="font-normal capitalize">
                                          {member.role}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                          <Calendar className="h-4 w-4" />
                                          {new Date(member.joined_at).toLocaleDateString('pt-BR')}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center justify-end gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 w-8 p-0 border-border/50 hover:border-primary hover:bg-primary/5"
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
                                            variant="outline"
                                            size="sm"
                                            className="h-8 w-8 p-0 border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400"
                                            onClick={() => {
                                              handleForcePasswordReset(member.profiles?.email || '');
                                            }}
                                            title="Forçar reset de senha"
                                          >
                                            <RotateCcw className="h-4 w-4" />
                                          </Button>
                                          
                                          <Button
                                            variant="destructive"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => {
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
                            </div>
                          )}
                          
                          {workspace.account_status?.suspension_reason && (
                            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                              <div className="flex items-center gap-2 text-destructive font-medium mb-1">
                                <AlertTriangle className="h-4 w-4" />
                                Motivo da suspensão
                              </div>
                              <p className="text-sm text-destructive/80">{workspace.account_status.suspension_reason}</p>
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
