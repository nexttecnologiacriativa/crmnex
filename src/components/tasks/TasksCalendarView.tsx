
import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, User, AlertCircle } from 'lucide-react';
import { getLeadDisplayName } from '@/lib/leadUtils';

interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to?: string;
  profiles?: {
    full_name: string;
  };
  leads?: {
    name: string;
    email?: string;
  };
}

interface TasksCalendarViewProps {
  tasks: Task[];
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const priorityLabels = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

export default function TasksCalendarView({ tasks }: TasksCalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const tasksForSelectedDate = tasks.filter(task => 
    task.due_date && isSameDay(new Date(task.due_date), selectedDate)
  );

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => 
      task.due_date && isSameDay(new Date(task.due_date), date)
    ).length;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Calendário de Tarefas</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            locale={ptBR}
            modifiers={{
              hasTasks: (date) => getTasksForDate(date) > 0
            }}
            modifiersClassNames={{
              hasTasks: 'bg-blue-100 text-blue-900 font-semibold'
            }}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Tarefas para {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasksForSelectedDate.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nenhuma tarefa para esta data
            </p>
          ) : (
            <div className="space-y-4">
              {tasksForSelectedDate.map((task) => (
                <div key={task.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{task.title}</h4>
                    {task.priority && (
                      <Badge className={priorityColors[task.priority]}>
                        {priorityLabels[task.priority]}
                      </Badge>
                    )}
                  </div>
                  
                  {task.description && (
                    <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {task.due_date && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(task.due_date), 'HH:mm')}
                      </div>
                    )}
                    
                    {task.profiles && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {task.profiles.full_name}
                      </div>
                    )}

                    {task.leads && (
                      <div className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {getLeadDisplayName(task.leads)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
