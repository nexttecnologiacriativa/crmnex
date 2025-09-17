import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, DollarSign, Mail, Phone, Tag, User, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getLeadDisplayName } from '@/lib/leadUtils';
import PipelineTagSelector from './PipelineTagSelector';

interface PipelineListViewProps {
  selectedPipelineId: string | null;
  filters: {
    search: string;
    priority: string;
    source: string;
    assignee: string;
  };
}

export default function PipelineListView({ selectedPipelineId, filters }: PipelineListViewProps) {
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // Buscar pipeline stages
  const { data: pipelineStages = [] } = useQuery({
    queryKey: ['pipeline-stages', selectedPipelineId],
    queryFn: async () => {
      if (!selectedPipelineId) return [];
      
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', selectedPipelineId)
        .order('position');

      if (error) throw error;
      return data;
    },
    enabled: !!selectedPipelineId,
  });

  // Buscar leads
  const { data: leads = [], refetch } = useQuery({
    queryKey: ['pipeline-leads-list', selectedPipelineId, stageFilter],
    queryFn: async () => {
      if (!selectedPipelineId) return [];
      
      let query = supabase
        .from('leads')
        .select(`
          *,
          pipeline_stages(name, color),
          lead_tag_relations(
            tag_id,
            lead_tags(id, name, color)
          )
        `)
        .eq('pipeline_id', selectedPipelineId)
        .order('created_at', { ascending: false });

      if (stageFilter !== 'all') {
        query = query.eq('stage_id', stageFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPipelineId,
  });

  // Filtrar leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchTerm || 
      getLeadDisplayName(lead).toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone?.includes(searchTerm) ||
      lead.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getTagValue = (pipelineTag: string | null) => {
    switch (pipelineTag) {
      case 'ganho': return 'Ganho';
      case 'perdido': return 'Perdido';
      default: return 'Aberto';
    }
  };

  const getTagColor = (pipelineTag: string | null) => {
    switch (pipelineTag) {
      case 'ganho': return 'bg-green-100 text-green-800';
      case 'perdido': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Nome, email, telefone ou empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <label className="text-sm font-medium mb-2 block">Estágio</label>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os estágios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os estágios</SelectItem>
                  {pipelineStages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Leads */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Leads ({filteredLeads.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Estágio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => {
                  const validTags = lead.lead_tag_relations
                    ?.map((relation: any) => relation.lead_tags)
                    .filter(Boolean) || [];

                  return (
                    <TableRow key={lead.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getLeadDisplayName(lead).substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{getLeadDisplayName(lead)}</div>
                            {lead.company && (
                              <div className="text-sm text-gray-500">{lead.company}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          {lead.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-gray-400" />
                              {lead.email}
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-gray-400" />
                              {lead.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: lead.pipeline_stages?.color }}
                          />
                          <span className="text-sm">{lead.pipeline_stages?.name}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <PipelineTagSelector 
                          leadId={lead.id} 
                          currentTag={lead.pipeline_tag}
                        />
                      </TableCell>
                      
                      <TableCell>
                        {lead.value && (
                          <div className="flex items-center gap-1 text-sm font-medium">
                            <DollarSign className="h-3 w-3 text-green-600" />
                            {lead.value.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            })}
                          </div>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {validTags.slice(0, 2).map((tag: any) => (
                            <Badge 
                              key={tag.id} 
                              variant="secondary" 
                              className="text-xs"
                              style={{
                                backgroundColor: tag.color + '15',
                                color: tag.color,
                                borderColor: tag.color
                              }}
                            >
                              {tag.name}
                            </Badge>
                          ))}
                          {validTags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{validTags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(lead.created_at), "dd/MM 'às' HH:mm", {
                            locale: ptBR
                          })}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => navigate(`/leads/${lead.id}`)}
                        >
                          Ver Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            
            {filteredLeads.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nenhum lead encontrado
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}