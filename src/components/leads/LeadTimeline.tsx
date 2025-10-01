import { useState, useMemo, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  MessageCircle, 
  Phone, 
  Mail, 
  FileText, 
  CheckCircle2, 
  Tag, 
  GitBranch, 
  Edit, 
  UserPlus,
  Clock,
  Search,
  Filter,
  ArrowRight,
  User,
  Pencil
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useLeadTimeline } from '@/hooks/useLeadTimeline';

// Hook para debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface TimelineEvent {
  id: string;
  type: 'activity' | 'whatsapp';
  title: string;
  description: string;
  metadata?: any;
  created_at: string;
  activity_type?: string;
  user?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface LeadTimelineProps {
  leadId: string;
  onEditActivity?: (activity: any) => void;
}

const activityTypeConfig = {
  note: { icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Anotação' },
  call: { icon: Phone, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Ligação' },
  email: { icon: Mail, color: 'text-purple-600', bgColor: 'bg-purple-100', label: 'Email' },
  meeting: { icon: User, color: 'text-orange-600', bgColor: 'bg-orange-100', label: 'Reunião' },
  stage_change: { icon: GitBranch, color: 'text-indigo-600', bgColor: 'bg-indigo-100', label: 'Mudança de Estágio' },
  data_update: { icon: Edit, color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Dados Atualizados' },
  tag_added: { icon: Tag, color: 'text-pink-600', bgColor: 'bg-pink-100', label: 'Tag Adicionada' },
  tag_removed: { icon: Tag, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Tag Removida' },
  task_created: { icon: CheckCircle2, color: 'text-cyan-600', bgColor: 'bg-cyan-100', label: 'Tarefa Criada' },
  task_completed: { icon: CheckCircle2, color: 'text-emerald-600', bgColor: 'bg-emerald-100', label: 'Tarefa Concluída' },
  whatsapp_message: { icon: MessageCircle, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Mensagem WhatsApp' },
};

export default function LeadTimeline({ leadId, onEditActivity }: LeadTimelineProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  
  // Debounce na busca para melhor performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Usar hook otimizado
  const { events: rawEvents, isLoading, error } = useLeadTimeline(leadId, true);

  // Filtrar eventos com debounced search
  const timelineEvents = useMemo(() => {
    let filtered = rawEvents;
    
    // Filtrar por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(event => {
        if (filterType === 'whatsapp_message') {
          return event.type === 'whatsapp';
        }
        return event.activity_type === filterType;
      });
    }
    
    // Filtrar por termo de busca (usando debounced)
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(term) ||
        event.description.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [rawEvents, debouncedSearchTerm, filterType]);

  // Agrupar por data
  const groupedEvents = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    
    timelineEvents.forEach(event => {
      const date = format(new Date(event.created_at), 'dd/MM/yyyy', { locale: ptBR });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
    });
    
    return groups;
  }, [timelineEvents]);

  const renderEventContent = (event: TimelineEvent) => {
    const eventType = event.type === 'whatsapp' ? 'whatsapp_message' : event.activity_type || 'note';
    const config = activityTypeConfig[eventType as keyof typeof activityTypeConfig] || activityTypeConfig.note;
    const Icon = config.icon;
    
    return (
      <div className="flex gap-3 group">
        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center`}>
          <Icon className={`h-5 w-5 ${config.color}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-sm">{event.title}</h4>
                <Badge variant="outline" className="text-xs">
                  {config.label}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground mt-1">
                {event.description}
              </p>
              
              {/* Metadata adicional */}
              {event.metadata && renderMetadata(event.type, event.metadata)}
              
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(event.created_at), "HH:mm", { locale: ptBR })}
                </span>
                {event.user && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {event.user.full_name}
                  </span>
                )}
                <span className="text-muted-foreground/60">
                  {formatDistanceToNow(new Date(event.created_at), { 
                    addSuffix: true,
                    locale: ptBR 
                  })}
                </span>
              </div>
            </div>
            
            {/* Botão de editar para atividades manuais */}
            {event.type === 'activity' && ['note', 'call', 'email', 'meeting'].includes(event.activity_type || '') && onEditActivity && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditActivity(event)}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMetadata = (type: string, metadata: any) => {
    if (!metadata) return null;
    
    switch (type) {
      case 'stage_change':
        return (
          <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
            <span className="flex items-center gap-1">
              Pipeline alterado
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        );
      
      case 'data_update':
        if (metadata.changes) {
          return (
            <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-1">
              {Object.entries(metadata.changes).map(([field, change]: [string, any]) => (
                <div key={field} className="flex items-center gap-2">
                  <span className="font-medium capitalize">{field}:</span>
                  <span className="text-muted-foreground line-through">{change.old || '(vazio)'}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="text-foreground">{change.new || '(vazio)'}</span>
                </div>
              ))}
            </div>
          );
        }
        break;
      
      case 'task_created':
      case 'task_completed':
        return (
          <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
            {metadata.priority && (
              <Badge variant="outline" className="text-xs">
                Prioridade: {metadata.priority}
              </Badge>
            )}
          </div>
        );
    }
    
    return null;
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-40" />
        </div>
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-red-500">
        Erro ao carregar histórico. Tente novamente.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros e busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar no histórico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os eventos</SelectItem>
            <SelectItem value="note">Anotações</SelectItem>
            <SelectItem value="call">Ligações</SelectItem>
            <SelectItem value="email">Emails</SelectItem>
            <SelectItem value="meeting">Reuniões</SelectItem>
            <SelectItem value="stage_change">Mudanças de estágio</SelectItem>
            <SelectItem value="data_update">Atualizações</SelectItem>
            <SelectItem value="tag_added">Tags adicionadas</SelectItem>
            <SelectItem value="tag_removed">Tags removidas</SelectItem>
            <SelectItem value="task_created">Tarefas criadas</SelectItem>
            <SelectItem value="task_completed">Tarefas concluídas</SelectItem>
            <SelectItem value="whatsapp_message">WhatsApp</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Timeline */}
      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([date, events]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-sm font-medium text-muted-foreground">
                  {date}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              
              <div className="space-y-4">
                {events.map((event) => {
                  const eventType = event.type === 'whatsapp' ? 'whatsapp_message' : event.activity_type || 'note';
                  return (
                  <Card key={event.id} className="border-l-4" style={{
                    borderLeftColor: activityTypeConfig[eventType as keyof typeof activityTypeConfig]?.color.replace('text-', '') || 'hsl(var(--primary))'
                  }}>
                    <CardContent className="p-4">
                      {renderEventContent(event)}
                    </CardContent>
                  </Card>
                )})}
              </div>
            </div>
          ))}
          
          {timelineEvents.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {searchTerm || filterType !== 'all' 
                  ? 'Nenhum evento encontrado com os filtros aplicados.'
                  : 'Nenhuma atividade registrada ainda.'}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}