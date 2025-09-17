import { useState } from 'react';
import { Plus, Play, Pause, Edit, Trash2, Eye, Bot, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CreateFlowDialog from './CreateFlowDialog';
import FlowBuilder from './FlowBuilder';
import AutomationLogs from './AutomationLogs';
import { useAutomationFlows } from '@/hooks/useAutomationFlows';

export default function AutomationDashboard() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<any>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const { flows, toggleFlow, deleteFlow } = useAutomationFlows();

  const handleCreateFlow = () => {
    setShowCreateDialog(true);
  };

  const handleEditFlow = (flow: any) => {
    setSelectedFlow(flow);
    setShowBuilder(true);
  };

  const handleViewLogs = (flow: any) => {
    setSelectedFlow(flow);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none border-b bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-nexcrm-green flex items-center gap-3">
              <Bot className="h-8 w-8 text-nexcrm-blue" />
              Automação WhatsApp
            </h1>
            <p className="text-gray-600 mt-2">
              Crie fluxos automáticos de mensagens baseados em gatilhos
            </p>
          </div>
          <Button onClick={handleCreateFlow} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Criar Fluxo
          </Button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <Tabs defaultValue="flows" className="h-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="flows" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Fluxos
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Logs de Execução
            </TabsTrigger>
          </TabsList>

          <TabsContent value="flows" className="space-y-6">
            {flows.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Bot className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Nenhum fluxo criado ainda
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Crie seu primeiro fluxo de automação para começar a enviar mensagens automaticamente
                  </p>
                  <Button onClick={handleCreateFlow} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Fluxo
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {flows.map((flow) => (
                  <Card key={flow.id} className="relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-full h-1 ${
                      flow.is_active ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                    
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{flow.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {flow.description}
                          </CardDescription>
                        </div>
                        <Switch
                          checked={flow.is_active}
                          onCheckedChange={() => toggleFlow(flow.id)}
                        />
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {flow.trigger_type}
                        </Badge>
                        <Badge variant={flow.is_active ? 'default' : 'secondary'} className="text-xs">
                          {flow.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>

                      <div className="text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Execuções:</span>
                          <span className="font-medium">{flow.execution_count || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Taxa de sucesso:</span>
                          <span className="font-medium text-green-600">
                            {flow.success_rate || 0}%
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditFlow(flow)}
                          className="flex-1"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewLogs(flow)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteFlow(flow.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="logs" className="h-full">
            <AutomationLogs selectedFlow={selectedFlow} />
          </TabsContent>
        </Tabs>
      </div>

      <CreateFlowDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={() => {
          setShowCreateDialog(false);
          // Refresh flows if needed
        }}
      />

      {showBuilder && selectedFlow && (
        <FlowBuilder
          flow={selectedFlow}
          onClose={() => {
            setShowBuilder(false);
            setSelectedFlow(null);
          }}
        />
      )}
    </div>
  );
}