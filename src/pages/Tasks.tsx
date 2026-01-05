
import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar, List, Grid } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import CreateTaskDialog from '@/components/tasks/CreateTaskDialog';
import EditTaskDialog from '@/components/tasks/EditTaskDialog';
import TasksFilters, { TaskFilters } from '@/components/tasks/TasksFilters';
import TasksListView from '@/components/tasks/TasksListView';
import TasksCalendarView from '@/components/tasks/TasksCalendarView';
import TaskCard from '@/components/tasks/TaskCard';
import { isWithinInterval, isAfter, isBefore } from 'date-fns';

type ViewMode = 'list' | 'cards' | 'calendar';

export default function Tasks() {
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [filters, setFilters] = useState<TaskFilters>({});
  const [activeTab, setActiveTab] = useState('active');

  const { data: tasks = [], isLoading } = useTasks();

  // Separar tarefas ativas das concluídas
  const activeTasks = tasks.filter(task => task.status !== 'completed');
  const completedTasks = tasks.filter(task => task.status === 'completed');

  const getFilteredTasks = (taskList: any[]) => {
    return taskList.filter(task => {
      // Filtro de busca
      if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase()) &&
          !task.description?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Filtro de status
      if (filters.status && task.status !== filters.status) {
        return false;
      }

      // Filtro de prioridade
      if (filters.priority && task.priority !== filters.priority) {
        return false;
      }

      // Filtro de data
      if (task.due_date && (filters.startDate || filters.endDate)) {
        const taskDate = new Date(task.due_date);
        
        if (filters.startDate && filters.endDate) {
          if (!isWithinInterval(taskDate, { start: filters.startDate, end: filters.endDate })) {
            return false;
          }
        } else if (filters.startDate && isBefore(taskDate, filters.startDate)) {
          return false;
        } else if (filters.endDate && isAfter(taskDate, filters.endDate)) {
          return false;
        }
      }

      return true;
    });
  };

  const filteredActiveTasks = getFilteredTasks(activeTasks);
  const filteredCompletedTasks = getFilteredTasks(completedTasks);

  const handleEditTask = (task: any) => {
    setSelectedTask(task);
    setIsEditDialogOpen(true);
  };

  const clearFilters = () => {
    setFilters({});
  };

  const renderTasksContent = (taskList: any[]) => {
    if (viewMode === 'calendar') {
      return <TasksCalendarView tasks={taskList} />;
    } else if (viewMode === 'list') {
      return <TasksListView tasks={taskList} onEditTask={handleEditTask} />;
    } else {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {taskList.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-gray-400 mb-4">
                <Plus className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                {activeTab === 'active' ? 'Nenhuma tarefa ativa encontrada' : 'Nenhuma tarefa concluída encontrada'}
              </h3>
              <p className="text-gray-500 mb-4">
                {activeTab === 'active' ? 'Tente ajustar os filtros ou criar uma nova tarefa.' : 'As tarefas concluídas aparecerão aqui.'}
              </p>
              {activeTab === 'active' && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeira tarefa
                </Button>
              )}
            </div>
          ) : (
            taskList.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={() => handleEditTask(task)}
              />
            ))
          )}
        </div>
      );
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <DashboardLayout>
        <div className="p-4 md:p-6">
          {/* Header - responsivo */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-nexcrm-green">
                Tarefas
              </h1>
              <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">Gerencie suas tarefas e acompanhe o progresso</p>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              {/* Botões de visualização */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8 px-2 md:px-3"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className="h-8 px-2 md:px-3"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                  className="h-8 px-2 md:px-3"
                >
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>

              <Button onClick={() => setIsCreateDialogOpen(true)} className="px-3 md:px-4">
                <Plus className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Nova Tarefa</span>
              </Button>
            </div>
          </div>

          <TasksFilters 
            onFiltersChange={setFilters}
            onClearFilters={clearFilters}
          />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="active">
                Ativas ({filteredActiveTasks.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Concluídas ({filteredCompletedTasks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-6">
              {renderTasksContent(filteredActiveTasks)}
            </TabsContent>

            <TabsContent value="completed" className="mt-6">
              {renderTasksContent(filteredCompletedTasks)}
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>

      <CreateTaskDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {selectedTask && (
        <EditTaskDialog
          task={selectedTask}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
    </>
  );
}
