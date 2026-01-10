import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  useCreateDistributionRule, 
  useUpdateDistributionRule,
  useDistributionMembers,
  useCreateDistributionMember,
  useUpdateDistributionMember,
  useDeleteDistributionMember,
  useMemberLeadCounts,
  type DistributionRule,
  type DistributionMode,
} from '@/hooks/useLeadDistribution';
import { usePipelines } from '@/hooks/usePipeline';
import { useWorkspace } from '@/hooks/useWorkspace';
import LeadDistributionMemberConfig from './LeadDistributionMemberConfig';

interface LeadDistributionRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: DistributionRule | null;
  members: Array<{
    id: string;
    user_id: string;
    profiles: { email: string; full_name: string | null } | null;
  }>;
}

const distributionModes: { value: DistributionMode; label: string; description: string }[] = [
  { value: 'round_robin', label: 'Round Robin', description: 'Distribui leads sequencialmente entre os membros' },
  { value: 'percentage', label: 'Porcentagem', description: 'Cada membro recebe uma % do total de leads' },
  { value: 'least_loaded', label: 'Menor Carga', description: 'Atribui ao membro com menos leads em aberto' },
  { value: 'fixed', label: 'Fixo', description: 'Sempre atribuir para um usuário específico' },
  { value: 'weighted_random', label: 'Peso Aleatório', description: 'Distribuição aleatória baseada em peso' },
];

const leadSources = [
  { value: 'meta', label: 'Meta Lead Ads' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'manual', label: 'Manual' },
];

const weekDays = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
];

export default function LeadDistributionRuleDialog({
  open,
  onOpenChange,
  rule,
  members,
}: LeadDistributionRuleDialogProps) {
  const { currentWorkspace } = useWorkspace();
  const { data: pipelines = [] } = usePipelines(currentWorkspace?.id);
  const { data: ruleMembers = [], refetch: refetchMembers } = useDistributionMembers(rule?.id);
  const createRule = useCreateDistributionRule();
  const updateRule = useUpdateDistributionRule();
  const createMember = useCreateDistributionMember();
  const updateMember = useUpdateDistributionMember();
  const deleteMember = useDeleteDistributionMember();

  const memberUserIds = ruleMembers.map(m => m.user_id);
  const { data: leadCounts = {} } = useMemberLeadCounts(memberUserIds);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [distributionMode, setDistributionMode] = useState<DistributionMode>('round_robin');
  const [selectedPipelines, setSelectedPipelines] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [activeDays, setActiveDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [activeHoursStart, setActiveHoursStart] = useState('');
  const [activeHoursEnd, setActiveHoursEnd] = useState('');
  const [priority, setPriority] = useState(0);
  const [fixedUserId, setFixedUserId] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberPercentages, setMemberPercentages] = useState<Record<string, number>>({});
  const [memberLimits, setMemberLimits] = useState<Record<string, { maxPerDay?: number; maxPerHour?: number; maxOpen?: number }>>({});

  const isEditing = !!rule;

  // Initialize form when rule changes
  useEffect(() => {
    if (rule) {
      setName(rule.name);
      setDescription(rule.description || '');
      setDistributionMode(rule.distribution_mode);
      setSelectedPipelines(rule.apply_to_pipelines || []);
      setSelectedSources(rule.apply_to_sources || []);
      setActiveDays(rule.active_days || [1, 2, 3, 4, 5]);
      setActiveHoursStart(rule.active_hours_start || '');
      setActiveHoursEnd(rule.active_hours_end || '');
      setPriority(rule.priority);
      setFixedUserId(rule.fixed_user_id);
    } else {
      resetForm();
    }
  }, [rule]);

  // Initialize members when ruleMembers changes
  useEffect(() => {
    if (ruleMembers.length > 0) {
      setSelectedMembers(ruleMembers.map(m => m.user_id));
      const percentages: Record<string, number> = {};
      const limits: Record<string, any> = {};
      ruleMembers.forEach(m => {
        percentages[m.user_id] = m.percentage;
        limits[m.user_id] = {
          maxPerDay: m.max_leads_per_day,
          maxPerHour: m.max_leads_per_hour,
          maxOpen: m.max_open_leads,
        };
      });
      setMemberPercentages(percentages);
      setMemberLimits(limits);
    }
  }, [ruleMembers]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setDistributionMode('round_robin');
    setSelectedPipelines([]);
    setSelectedSources([]);
    setActiveDays([1, 2, 3, 4, 5]);
    setActiveHoursStart('');
    setActiveHoursEnd('');
    setPriority(0);
    setFixedUserId(null);
    setSelectedMembers([]);
    setMemberPercentages({});
    setMemberLimits({});
  };

  const handlePipelineToggle = (pipelineId: string) => {
    setSelectedPipelines(prev =>
      prev.includes(pipelineId)
        ? prev.filter(id => id !== pipelineId)
        : [...prev, pipelineId]
    );
  };

  const handleSourceToggle = (source: string) => {
    setSelectedSources(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  const handleDayToggle = (day: number) => {
    setActiveDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleMemberToggle = (userId: string) => {
    setSelectedMembers(prev => {
      if (prev.includes(userId)) {
        const newPercentages = { ...memberPercentages };
        delete newPercentages[userId];
        setMemberPercentages(newPercentages);
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handlePercentageChange = (userId: string, percentage: number) => {
    setMemberPercentages(prev => ({
      ...prev,
      [userId]: percentage,
    }));
  };

  const handleLimitsChange = (userId: string, limits: { maxPerDay?: number; maxPerHour?: number; maxOpen?: number }) => {
    setMemberLimits(prev => ({
      ...prev,
      [userId]: limits,
    }));
  };

  const totalPercentage = Object.values(memberPercentages).reduce((acc, val) => acc + (val || 0), 0);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    const ruleData = {
      name,
      description: description || null,
      distribution_mode: distributionMode,
      apply_to_pipelines: selectedPipelines,
      apply_to_sources: selectedSources,
      active_days: activeDays,
      active_hours_start: activeHoursStart || null,
      active_hours_end: activeHoursEnd || null,
      priority,
      fixed_user_id: distributionMode === 'fixed' ? fixedUserId : null,
    };

    try {
      if (isEditing && rule) {
        await updateRule.mutateAsync({ id: rule.id, ...ruleData });

        // Update members
        const existingMemberIds = ruleMembers.map(m => m.user_id);
        
        // Delete removed members
        for (const member of ruleMembers) {
          if (!selectedMembers.includes(member.user_id)) {
            await deleteMember.mutateAsync(member.id);
          }
        }

        // Update or create members
        for (const userId of selectedMembers) {
          const existingMember = ruleMembers.find(m => m.user_id === userId);
          const memberData = {
            percentage: memberPercentages[userId] || 0,
            max_leads_per_day: memberLimits[userId]?.maxPerDay || null,
            max_leads_per_hour: memberLimits[userId]?.maxPerHour || null,
            max_open_leads: memberLimits[userId]?.maxOpen || null,
            is_active: true,
          };

          if (existingMember) {
            await updateMember.mutateAsync({ id: existingMember.id, ...memberData });
          } else {
            await createMember.mutateAsync({
              rule_id: rule.id,
              user_id: userId,
              ...memberData,
            });
          }
        }
      } else {
        const newRule = await createRule.mutateAsync(ruleData);

        // Create members
        for (const userId of selectedMembers) {
          await createMember.mutateAsync({
            rule_id: newRule.id,
            user_id: userId,
            percentage: memberPercentages[userId] || 0,
            max_leads_per_day: memberLimits[userId]?.maxPerDay || null,
            max_leads_per_hour: memberLimits[userId]?.maxPerHour || null,
            max_open_leads: memberLimits[userId]?.maxOpen || null,
            is_active: true,
          });
        }
      }

      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error saving rule:', error);
    }
  };

  const isLoading = createRule.isPending || updateRule.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Regra de Distribuição' : 'Nova Regra de Distribuição'}
          </DialogTitle>
          <DialogDescription>
            Configure como os leads serão distribuídos automaticamente
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Regra *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Distribuição Vendas"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva quando esta regra se aplica"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Input
                  id="priority"
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Maior número = maior prioridade
                </p>
              </div>
            </div>

            <Separator />

            {/* Application Conditions */}
            <div className="space-y-4">
              <h4 className="font-medium">Quando Aplicar</h4>

              <div className="space-y-2">
                <Label>Pipelines</Label>
                <div className="flex flex-wrap gap-2">
                  {pipelines.map((pipeline) => (
                    <label
                      key={pipeline.id}
                      className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-muted"
                    >
                      <Checkbox
                        checked={selectedPipelines.includes(pipeline.id)}
                        onCheckedChange={() => handlePipelineToggle(pipeline.id)}
                      />
                      <span className="text-sm">{pipeline.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Deixe vazio para aplicar a todos os pipelines
                </p>
              </div>

              <div className="space-y-2">
                <Label>Fontes de Lead</Label>
                <div className="flex flex-wrap gap-2">
                  {leadSources.map((source) => (
                    <label
                      key={source.value}
                      className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-muted"
                    >
                      <Checkbox
                        checked={selectedSources.includes(source.value)}
                        onCheckedChange={() => handleSourceToggle(source.value)}
                      />
                      <span className="text-sm">{source.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Deixe vazio para aplicar a todas as fontes
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Horário Início</Label>
                  <Input
                    type="time"
                    value={activeHoursStart}
                    onChange={(e) => setActiveHoursStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Horário Fim</Label>
                  <Input
                    type="time"
                    value={activeHoursEnd}
                    onChange={(e) => setActiveHoursEnd(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dias da Semana</Label>
                <div className="flex gap-2">
                  {weekDays.map((day) => (
                    <label
                      key={day.value}
                      className={`flex items-center justify-center w-10 h-10 border rounded-lg cursor-pointer transition-colors ${
                        activeDays.includes(day.value)
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={activeDays.includes(day.value)}
                        onChange={() => handleDayToggle(day.value)}
                      />
                      <span className="text-xs font-medium">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* Distribution Mode */}
            <div className="space-y-4">
              <h4 className="font-medium">Modo de Distribuição</h4>
              <RadioGroup value={distributionMode} onValueChange={(v) => setDistributionMode(v as DistributionMode)}>
                {distributionModes.map((mode) => (
                  <label
                    key={mode.value}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      distributionMode === mode.value ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                    }`}
                  >
                    <RadioGroupItem value={mode.value} className="mt-0.5" />
                    <div>
                      <span className="font-medium">{mode.label}</span>
                      <p className="text-sm text-muted-foreground">{mode.description}</p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Fixed User Selection */}
            {distributionMode === 'fixed' && (
              <div className="space-y-2">
                <Label>Atribuir sempre para</Label>
                <Select value={fixedUserId || ''} onValueChange={setFixedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um membro" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.profiles?.full_name || member.profiles?.email || 'Usuário'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Members Configuration */}
            {distributionMode !== 'fixed' && (
              <>
                <Separator />
                <LeadDistributionMemberConfig
                  members={members}
                  selectedMembers={selectedMembers}
                  memberPercentages={memberPercentages}
                  memberLimits={memberLimits}
                  leadCounts={leadCounts}
                  distributionMode={distributionMode}
                  onMemberToggle={handleMemberToggle}
                  onPercentageChange={handlePercentageChange}
                  onLimitsChange={handleLimitsChange}
                />
                {distributionMode === 'percentage' && (
                  <div className={`text-sm ${totalPercentage === 100 ? 'text-green-600' : 'text-destructive'}`}>
                    Total: {totalPercentage}%
                    {totalPercentage !== 100 && ' (deve ser 100%)'}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || !name.trim() || (distributionMode === 'percentage' && totalPercentage !== 100)}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEditing ? 'Salvar Alterações' : 'Criar Regra'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
