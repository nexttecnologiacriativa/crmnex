import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Eye, MessageSquare, Star, Layout } from 'lucide-react';
import { useUserSettings, useUpdateUserSettings } from '@/hooks/useUserWorkspaceSettings';
import { useAllWorkspaceInstances, useInstanceUsers, useManageInstanceUsers } from '@/hooks/useWhatsAppInstance';
import { toast } from 'sonner';

interface UserPermissionsManagerProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userRole: string;
}

const ALL_SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', group: 'menu' },
  { id: 'leads', label: 'Leads', group: 'menu' },
  { id: 'pipeline', label: 'Pipeline', group: 'menu' },
  { id: 'atendimento', label: 'Atendimento', group: 'menu' },
  { id: 'tasks', label: 'Tarefas', group: 'menu' },
  { id: 'jobs', label: 'Jobs', group: 'menu' },
  { id: 'reports', label: 'Relatórios', group: 'menu' },
  { id: 'settings', label: 'Configurações', group: 'menu' },
  { id: 'marketing', label: 'Marketing', group: 'performance' },
  { id: 'automation', label: 'Automação', group: 'performance' },
  { id: 'outbound', label: 'Outbound', group: 'performance' },
  { id: 'tv-dashboard', label: 'Dashboard TV', group: 'performance' },
  { id: 'debriefing', label: 'Debriefing', group: 'performance' },
];

const DEFAULT_SECTIONS = ALL_SECTIONS.map(s => s.id);

export default function UserPermissionsManager({
  open,
  onClose,
  userId,
  userName,
  userRole,
}: UserPermissionsManagerProps) {
  const { data: settings, isLoading: isLoadingSettings } = useUserSettings(userId);
  const updateSettings = useUpdateUserSettings();
  const { data: instances = [] } = useAllWorkspaceInstances();
  const { data: userInstanceIds = [], refetch: refetchInstanceUsers } = useInstanceUsers(userId);
  const manageInstanceUsers = useManageInstanceUsers();
  
  const [canSeeAllLeads, setCanSeeAllLeads] = useState(false);
  const [canSeeUnassignedLeads, setCanSeeUnassignedLeads] = useState(true);
  const [defaultInstanceId, setDefaultInstanceId] = useState<string | null>(null);
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);
  const [allowedSections, setAllowedSections] = useState<string[]>(DEFAULT_SECTIONS);
  
  useEffect(() => {
    if (settings) {
      setCanSeeAllLeads(settings.can_see_all_leads || false);
      setCanSeeUnassignedLeads(settings.can_see_unassigned_leads !== false);
      setDefaultInstanceId(settings.default_whatsapp_instance_id);
      setAllowedSections(settings.allowed_sections || DEFAULT_SECTIONS);
    }
  }, [settings]);
  
  useEffect(() => {
    setSelectedInstances(userInstanceIds);
  }, [userInstanceIds]);

  const handleSave = async () => {
    try {
      // Salvar configurações do usuário
      await updateSettings.mutateAsync({
        user_id: userId,
        can_see_all_leads: canSeeAllLeads,
        can_see_unassigned_leads: canSeeUnassignedLeads,
        default_whatsapp_instance_id: defaultInstanceId,
        allowed_sections: allowedSections,
      });
      
      // Atualizar acesso às instâncias
      for (const instance of instances) {
        const hasAccess = selectedInstances.includes(instance.id);
        const hadAccess = userInstanceIds.includes(instance.id);
        
        if (hasAccess !== hadAccess) {
          await manageInstanceUsers.mutateAsync({
            instanceId: instance.id,
            userId,
            action: hasAccess ? 'add' : 'remove',
          });
        }
      }
      
      refetchInstanceUsers();
      onClose();
    } catch (error) {
      // Error handling in hooks
    }
  };

  const toggleInstanceAccess = (instanceId: string) => {
    setSelectedInstances(prev => 
      prev.includes(instanceId) 
        ? prev.filter(id => id !== instanceId)
        : [...prev, instanceId]
    );
  };

  const toggleSection = (sectionId: string) => {
    setAllowedSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const isAdmin = userRole === 'admin';

  const menuSections = ALL_SECTIONS.filter(s => s.group === 'menu');
  const performanceSections = ALL_SECTIONS.filter(s => s.group === 'performance');

  if (isLoadingSettings) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Configurações de {userName}
            <Badge variant="outline" className="text-xs">
              {userRole}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Acesso a Seções */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layout className="h-4 w-4" />
                Seções com Acesso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAdmin ? (
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  Administradores têm acesso total a todas as seções automaticamente.
                </p>
              ) : (
                <>
                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Menu Principal</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {menuSections.map((section) => (
                        <div key={section.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`section-${section.id}`}
                            checked={allowedSections.includes(section.id)}
                            onCheckedChange={() => toggleSection(section.id)}
                          />
                          <label 
                            htmlFor={`section-${section.id}`}
                            className="text-sm cursor-pointer"
                          >
                            {section.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Performance</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {performanceSections.map((section) => (
                        <div key={section.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`section-${section.id}`}
                            checked={allowedSections.includes(section.id)}
                            onCheckedChange={() => toggleSection(section.id)}
                          />
                          <label 
                            htmlFor={`section-${section.id}`}
                            className="text-sm cursor-pointer"
                          >
                            {section.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Acesso a Leads */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Acesso a Leads
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAdmin ? (
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  Administradores têm acesso total a todos os leads automaticamente.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Ver todos os leads</Label>
                      <p className="text-xs text-muted-foreground">
                        Se desativado, só verá leads atribuídos a ele
                      </p>
                    </div>
                    <Switch
                      checked={canSeeAllLeads}
                      onCheckedChange={setCanSeeAllLeads}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Ver leads sem atribuição</Label>
                      <p className="text-xs text-muted-foreground">
                        Pode visualizar leads que não foram atribuídos
                      </p>
                    </div>
                    <Switch
                      checked={canSeeUnassignedLeads}
                      onCheckedChange={setCanSeeUnassignedLeads}
                      disabled={canSeeAllLeads}
                    />
                  </div>
                  
                  {!canSeeAllLeads && (
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                      <p className="text-xs text-amber-800">
                        ⚠️ Este usuário só verá leads atribuídos a ele
                        {canSeeUnassignedLeads && ' e leads sem atribuição'}.
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Acesso ao WhatsApp */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {instances.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma instância WhatsApp configurada.
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Instâncias com acesso</Label>
                    <div className="space-y-2">
                      {instances.map((instance) => (
                        <div 
                          key={instance.id} 
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted"
                        >
                          <Checkbox
                            id={`instance-${instance.id}`}
                            checked={selectedInstances.includes(instance.id)}
                            onCheckedChange={() => toggleInstanceAccess(instance.id)}
                          />
                          <label 
                            htmlFor={`instance-${instance.id}`} 
                            className="flex-1 cursor-pointer"
                          >
                            <p className="font-medium text-sm">
                              {instance.display_name || instance.instance_name}
                            </p>
                            {instance.phone_number && (
                              <p className="text-xs text-muted-foreground">
                                {instance.phone_number}
                              </p>
                            )}
                          </label>
                          <Badge 
                            variant="outline" 
                            className={
                              instance.status === 'open' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }
                          >
                            {instance.status === 'open' ? 'Conectado' : instance.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedInstances.length > 0 && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500" />
                        Instância padrão
                      </Label>
                      <Select 
                        value={defaultInstanceId || ''} 
                        onValueChange={(v) => setDefaultInstanceId(v || null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a instância padrão" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nenhuma</SelectItem>
                          {instances
                            .filter(i => selectedInstances.includes(i.id))
                            .map((instance) => (
                              <SelectItem key={instance.id} value={instance.id}>
                                {instance.display_name || instance.instance_name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Esta instância será selecionada automaticamente ao abrir o atendimento.
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={updateSettings.isPending || manageInstanceUsers.isPending}
          >
            {(updateSettings.isPending || manageInstanceUsers.isPending) && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
