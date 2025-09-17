import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Filter,
  Calendar,
  User,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { useAutomationLogs } from '@/hooks/useAutomationLogs';

interface AutomationLogsProps {
  selectedFlow?: any;
}

export default function AutomationLogs({ selectedFlow }: AutomationLogsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  
  const { logs, loading, refreshLogs } = useAutomationLogs(selectedFlow?.id);

  useEffect(() => {
    refreshLogs();
  }, [selectedFlow]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      success: 'default',
      error: 'destructive',
      pending: 'secondary'
    };
    
    const labels = {
      success: 'Sucesso',
      error: 'Erro',
      pending: 'Pendente'
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.lead_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.flow_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    
    // Add date filtering logic here
    const matchesDate = true; // Placeholder
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>
            Filtre os logs de execução por lead, fluxo, status ou período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Nome do lead ou fluxo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Ações</label>
              <Button onClick={refreshLogs} variant="outline" className="w-full">
                Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de logs */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 animate-spin" />
                Carregando logs...
              </div>
            </CardContent>
          </Card>
        ) : filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum log encontrado
              </h3>
              <p className="text-gray-600 text-center">
                {selectedFlow 
                  ? `Não há execuções registradas para o fluxo "${selectedFlow.name}"`
                  : 'Não há logs de automação registrados ainda'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredLogs.map((log) => (
            <Card key={log.id} className="relative">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(log.status)}
                      <div>
                        <h4 className="font-semibold">{log.flow_name}</h4>
                        <p className="text-sm text-gray-600">
                          Lead: {log.lead_name || 'Nome não disponível'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(log.executed_at).toLocaleString('pt-BR')}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {log.step_name || 'Etapa não especificada'}
                      </div>
                    </div>
                    
                    {log.message_sent && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-900 font-medium mb-1">
                          Mensagem enviada:
                        </p>
                        <p className="text-sm text-blue-800">
                          {log.message_sent.length > 100 
                            ? `${log.message_sent.substring(0, 100)}...`
                            : log.message_sent
                          }
                        </p>
                      </div>
                    )}
                    
                    {log.error_message && (
                      <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-sm text-red-900 font-medium mb-1">
                          Erro:
                        </p>
                        <p className="text-sm text-red-800">{log.error_message}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4">
                    {getStatusBadge(log.status)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}