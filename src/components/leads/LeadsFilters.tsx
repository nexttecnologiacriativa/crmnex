
import { useState } from 'react';
import { Search, Filter, X, User, MapPin, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface LeadsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  source: string;
  onSourceChange: (value: string) => void;
  assignee: string;
  onAssigneeChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  dateFrom: Date | undefined;
  onDateFromChange: (date: Date | undefined) => void;
  dateTo: Date | undefined;
  onDateToChange: (date: Date | undefined) => void;
  onClearFilters: () => void;
}

export default function LeadsFilters({
  search,
  onSearchChange,
  source,
  onSourceChange,
  assignee,
  onAssigneeChange,
  status,
  onStatusChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onClearFilters,
}: LeadsFiltersProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDateFromOpen, setIsDateFromOpen] = useState(false);
  const [isDateToOpen, setIsDateToOpen] = useState(false);

  const activeFiltersCount = [source, assignee, status, dateFrom, dateTo].filter(Boolean).length;

  const clearAllFilters = () => {
    onSourceChange('');
    onAssigneeChange('');
    onStatusChange('');
    onSearchChange('');
    onDateFromChange(undefined);
    onDateToChange(undefined);
    onClearFilters();
  };

  const statusOptions = [
    { value: 'new', label: 'Novo' },
    { value: 'contacted', label: 'Contatado' },
    { value: 'qualified', label: 'Qualificado' },
    { value: 'proposal', label: 'Proposta' },
    { value: 'negotiation', label: 'Negociação' },
    { value: 'closed_won', label: 'Ganho' },
    { value: 'closed_lost', label: 'Perdido' },
  ];

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Busca */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nome, empresa ou email..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 border-gray-200 focus:border-purple-300"
              />
            </div>
          </div>

          {/* Filtros Avançados */}
          <div className="flex items-center gap-2">
            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="relative border-gray-200 hover:border-purple-300"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <Badge className="ml-2 bg-purple-600 text-white h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">Filtros Avançados</h3>
                    {activeFiltersCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllFilters}
                        className="text-gray-500 hover:text-gray-700 h-auto p-1"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Limpar
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-3">
                    {/* Status */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Status
                      </label>
                      <Select value={status || "all"} onValueChange={(value) => onStatusChange(value === "all" ? "" : value)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Todos os status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os status</SelectItem>
                          {statusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Fonte */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Fonte
                      </label>
                      <Select value={source || "all"} onValueChange={(value) => onSourceChange(value === "all" ? "" : value)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Todas as fontes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as fontes</SelectItem>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="social">Redes Sociais</SelectItem>
                          <SelectItem value="referral">Indicação</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Telefone</SelectItem>
                          <SelectItem value="event">Evento</SelectItem>
                          <SelectItem value="other">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Responsável */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Responsável
                      </label>
                      <Select value={assignee || "all"} onValueChange={(value) => onAssigneeChange(value === "all" ? "" : value)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Todos os responsáveis" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os responsáveis</SelectItem>
                          <SelectItem value="unassigned">Não atribuído</SelectItem>
                          <SelectItem value="me">Atribuído a mim</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filtros de Data */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Data Inicial
                        </label>
                        <Popover open={isDateFromOpen} onOpenChange={setIsDateFromOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !dateFrom && "text-muted-foreground"
                              )}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={dateFrom}
                              onSelect={(date) => {
                                onDateFromChange(date);
                                setIsDateFromOpen(false);
                              }}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Data Final
                        </label>
                        <Popover open={isDateToOpen} onOpenChange={setIsDateToOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !dateTo && "text-muted-foreground"
                              )}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={dateTo}
                              onSelect={(date) => {
                                onDateToChange(date);
                                setIsDateToOpen(false);
                              }}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Limpar filtros quando há filtros ativos */}
            {(search || activeFiltersCount > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Filtros ativos */}
        {(source || assignee || status || dateFrom || dateTo) && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
            {status && (
              <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
                Status: {statusOptions.find(s => s.value === status)?.label}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-auto p-0.5 hover:bg-purple-200"
                  onClick={() => onStatusChange('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {source && (
              <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                Fonte: {source}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-auto p-0.5 hover:bg-green-200"
                  onClick={() => onSourceChange('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {assignee && (
              <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                Responsável: {assignee === 'me' ? 'Eu' : assignee === 'unassigned' ? 'Não atribuído' : assignee}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-auto p-0.5 hover:bg-yellow-200"
                  onClick={() => onAssigneeChange('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {dateFrom && (
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                De: {format(dateFrom, "dd/MM/yyyy", { locale: ptBR })}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-auto p-0.5 hover:bg-blue-200"
                  onClick={() => onDateFromChange(undefined)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {dateTo && (
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                Até: {format(dateTo, "dd/MM/yyyy", { locale: ptBR })}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-auto p-0.5 hover:bg-blue-200"
                  onClick={() => onDateToChange(undefined)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
