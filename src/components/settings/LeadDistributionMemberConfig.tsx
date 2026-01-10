import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { type DistributionMode } from '@/hooks/useLeadDistribution';

interface Member {
  id: string;
  user_id: string;
  profiles: { email: string; full_name: string | null } | null;
}

interface LeadDistributionMemberConfigProps {
  members: Member[];
  selectedMembers: string[];
  memberPercentages: Record<string, number>;
  memberLimits: Record<string, { maxPerDay?: number; maxPerHour?: number; maxOpen?: number }>;
  leadCounts: Record<string, number>;
  distributionMode: DistributionMode;
  onMemberToggle: (userId: string) => void;
  onPercentageChange: (userId: string, percentage: number) => void;
  onLimitsChange: (userId: string, limits: { maxPerDay?: number; maxPerHour?: number; maxOpen?: number }) => void;
}

export default function LeadDistributionMemberConfig({
  members,
  selectedMembers,
  memberPercentages,
  memberLimits,
  leadCounts,
  distributionMode,
  onMemberToggle,
  onPercentageChange,
  onLimitsChange,
}: LeadDistributionMemberConfigProps) {
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  const maxLeads = Math.max(...Object.values(leadCounts), 1);

  const handleLimitChange = (userId: string, field: string, value: string) => {
    const numValue = value ? parseInt(value) : undefined;
    onLimitsChange(userId, {
      ...memberLimits[userId],
      [field]: numValue,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Membros Participantes
        </h4>
        <Badge variant="outline">
          {selectedMembers.length} selecionado(s)
        </Badge>
      </div>

      <div className="space-y-2">
        {members.map((member) => {
          const isSelected = selectedMembers.includes(member.user_id);
          const memberLeadCount = leadCounts[member.user_id] || 0;
          const isExpanded = expandedMember === member.user_id;

          return (
            <Collapsible
              key={member.user_id}
              open={isExpanded && isSelected}
              onOpenChange={() => setExpandedMember(isExpanded ? null : member.user_id)}
            >
              <div
                className={`border rounded-lg transition-colors ${
                  isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                }`}
              >
                <div className="p-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onMemberToggle(member.user_id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {member.profiles?.full_name || 'Usuário'}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {memberLeadCount} leads
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {member.profiles?.email}
                      </p>
                    </div>

                    {distributionMode === 'percentage' && isSelected && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={memberPercentages[member.user_id] || 0}
                          onChange={(e) => onPercentageChange(member.user_id, parseInt(e.target.value) || 0)}
                          className="w-20 text-center"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    )}

                    {isSelected && (
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    )}
                  </div>

                  {/* Lead count visualization */}
                  <div className="mt-2">
                    <Progress 
                      value={(memberLeadCount / maxLeads) * 100} 
                      className="h-1.5"
                    />
                  </div>
                </div>

                <CollapsibleContent>
                  <div className="px-3 pb-3 pt-1 border-t">
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Máx/dia</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="∞"
                          value={memberLimits[member.user_id]?.maxPerDay || ''}
                          onChange={(e) => handleLimitChange(member.user_id, 'maxPerDay', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Máx/hora</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="∞"
                          value={memberLimits[member.user_id]?.maxPerHour || ''}
                          onChange={(e) => handleLimitChange(member.user_id, 'maxPerHour', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Máx abertos</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="∞"
                          value={memberLimits[member.user_id]?.maxOpen || ''}
                          onChange={(e) => handleLimitChange(member.user_id, 'maxOpen', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>

      {members.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum membro disponível</p>
        </div>
      )}
    </div>
  );
}
