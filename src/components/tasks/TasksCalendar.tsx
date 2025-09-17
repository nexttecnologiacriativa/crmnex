import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Clock, User } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { useWorkspace } from '@/hooks/useWorkspace';
import CreateTaskDialog from './CreateTaskDialog';
import TaskCard from './TaskCard';

export default function TasksCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const { currentWorkspace } = useWorkspace();
  const { data: tasks = [], isLoading } = useTasks();

  const getTasksForDate = (date: Date | undefined) => {
    if (!date) return [];
    
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(task => {
      if (!task.due_date) return false;
      const taskDate = new Date(task.due_date).toISOString().split('T')[0];
      return taskDate === dateStr;
    });
  };

  const getTodayTasks = () => {
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter(task => {
      if (!task.due_date) return false;
      const taskDate = new Date(task.due_date).toISOString().split('T')[0];
      return taskDate === today;
    });
  };

  const getOverdueTasks = () => {
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter(task => {
      if (!task.due_date || task.status === 'completed') return false;
      const taskDate = new Date(task.due_date).toISOString().split('T')[0];
      return taskDate < today;
    });
  };

  const selectedDateTasks = getTasksForDate(selectedDate);
  const todayTasks = getTodayTasks();
  const overdueTasks = getOverdueTasks();

  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tarefas</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Tarefa
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendário */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Calendário</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Tarefas */}
        <div className="lg:col-span-3 space-y-6">
          {/* Tarefas em atraso */}
          {overdueTasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-red-600 flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Tarefas em Atraso ({overdueTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overdueTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tarefas de hoje */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Hoje ({todayTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayTasks.length > 0 ? (
                <div className="space-y-3">
                  {todayTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  Nenhuma tarefa para hoje
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tarefas do dia selecionado */}
          {selectedDate && selectedDate.toDateString() !== new Date().toDateString() && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedDate.toLocaleDateString('pt-BR')} ({selectedDateTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDateTasks.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDateTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    Nenhuma tarefa para este dia
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <CreateTaskDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
