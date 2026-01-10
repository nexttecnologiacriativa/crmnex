import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Edit, Trash2, Users, RefreshCw, Play, Pause, AlertCircle } from 'lucide-react';
import { 
  useDistributionRules, 
  useUpdateDistributionRule, 
  useDeleteDistributionRule,
  useDistributionStats,
  useDistributePendingLeads,
  type DistributionRule 
} from '@/hooks/useLeadDistribution';
import { useTeamManagement } from '@/hooks/useTeamManagement';
import LeadDistributionRuleDialog from './LeadDistributionRuleDialog';
import LeadDistributionStats from './LeadDistributionStats';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface LeadDistributionSettingsProps {
  currentUserRole?: string;
}

const modeLabels: Record<string, string> = {
  round_robin: 'Round Robin',
  percentage: 'Porcentagem',
  least_loaded: 'Menor Carga',
  fixed: 'Fixo',
  weighted_random: 'Peso Aleatório',
};

const sourceLabels: Record<string, string> = {
  meta: 'Meta Lead Ads',
  whatsapp: 'WhatsApp',
  webhook: 'Webhook',
  manual: 'Manual',
};

export default function LeadDistributionSettings({ currentUserRole }: LeadDistributionSettingsProps) {
  const { data: rules = [], isLoading } = useDistributionRules();
  const { data: stats } = useDistributionStats();
  const updateRule = useUpdateDistributionRule();
  const deleteRule = useDeleteDistributionRule();
  const distributePending = useDistributePendingLeads();
  const { members } = useTeamManagement();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<DistributionRule | null>(null);
  const [deleteConfirmRule, setDeleteConfirmRule] = useState<DistributionRule | null>(null);

  const isAdmin = currentUserRole === 'admin';

  const handleToggleActive = async (rule: DistributionRule) => {
    await updateRule.mutateAsync({
      id: rule.id,
      is_active: !rule.is_active,
    });
  };

  const handleEdit = (rule: DistributionRule) => {
    setEditingRule(rule);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteConfirmRule) {
      await deleteRule.mutateAsync(deleteConfirmRule.id);
      setDeleteConfirmRule(null);
    }
  };

  const handleCreateNew = () => {
    setEditingRule(null);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <LeadDistributionStats stats={stats} />

      {/* Rules List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Regras de Distribuição
            </CardTitle>
            <CardDescription>
              Configure como os leads serão distribuídos automaticamente entre os membros da equipe
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => distributePending.mutate()}
              disabled={distributePending.isPending || !isAdmin}
            >
              {distributePending.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Distribuir Pendentes
            </Button>
            <Button onClick={handleCreateNew} disabled={!isAdmin}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Regra
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!isAdmin && (
            <div className="flex items-center gap-2 p-4 mb-4 bg-muted rounded-lg">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Apenas administradores podem gerenciar regras de distribuição
              </span>
            </div>
          )}

          {rules.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma regra configurada</h3>
              <p className="text-muted-foreground mb-4">
                Crie sua primeira regra de distribuição para começar a distribuir leads automaticamente
              </p>
              {isAdmin && (
                <Button onClick={handleCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Regra
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`border rounded-lg p-4 transition-all ${
                    rule.is_active ? 'bg-background' : 'bg-muted/50 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            rule.is_active ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        />
                        <h4 className="font-semibold">{rule.name}</h4>
                        <Badge variant="secondary">
                          {modeLabels[rule.distribution_mode] || rule.distribution_mode}
                        </Badge>
                        <Badge variant="outline">Prioridade {rule.priority}</Badge>
                      </div>

                      {rule.description && (
                        <p className="text-sm text-muted-foreground mb-2">{rule.description}</p>
                      )}

                      <div className="flex flex-wrap gap-2 text-sm">
                        {rule.apply_to_sources && rule.apply_to_sources.length > 0 && (
                          <span className="text-muted-foreground">
                            Fontes:{' '}
                            {rule.apply_to_sources
                              .map((s) => sourceLabels[s] || s)
                              .join(', ')}
                          </span>
                        )}
                        {rule.apply_to_pipelines && rule.apply_to_pipelines.length > 0 && (
                          <span className="text-muted-foreground">
                            • {rule.apply_to_pipelines.length} pipeline(s)
                          </span>
                        )}
                        {rule.active_hours_start && rule.active_hours_end && (
                          <span className="text-muted-foreground">
                            • {rule.active_hours_start} - {rule.active_hours_end}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={() => handleToggleActive(rule)}
                        disabled={!isAdmin || updateRule.isPending}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(rule)}
                        disabled={!isAdmin}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirmRule(rule)}
                        disabled={!isAdmin}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <LeadDistributionRuleDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        rule={editingRule}
        members={members}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmRule} onOpenChange={() => setDeleteConfirmRule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir regra de distribuição?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a regra "{deleteConfirmRule?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
