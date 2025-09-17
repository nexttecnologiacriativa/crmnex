import { useState } from 'react';
import { Plus, Settings, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDebriefings, type Debriefing } from '@/hooks/useDebriefings';
import { DebriefingsList } from '@/components/debriefing/DebriefingsList';
import { DebriefingSettingsDialog } from '@/components/debriefing/DebriefingSettingsDialog';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useNavigate } from 'react-router-dom';

const Debriefing = () => {
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { debriefings, isLoading } = useDebriefings();
  const navigate = useNavigate();

  const handleView = (debriefing: Debriefing) => {
    navigate(`/debriefing/${debriefing.id}`);
  };

  const handleCreate = () => {
    navigate('/debriefing/create');
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Debriefing Estratégico</h1>
            <p className="text-muted-foreground">
              Registre aprendizados e dados detalhados de lançamentos e campanhas
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSettingsDialog(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </Button>
            <Button
              onClick={handleCreate}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Debriefing
            </Button>
          </div>
        </div>

        {/* Lista de Debriefings */}
        <DebriefingsList 
          debriefings={debriefings} 
          isLoading={isLoading}
          onView={handleView}
        />


        {/* Dialog de configurações */}
        <DebriefingSettingsDialog
          open={showSettingsDialog}
          onOpenChange={setShowSettingsDialog}
        />
      </div>
    </DashboardLayout>
  );
};

export default Debriefing;