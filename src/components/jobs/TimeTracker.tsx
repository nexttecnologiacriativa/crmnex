
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Play, Square, Clock } from 'lucide-react';
import { useStartTimeTracking, useStopTimeTracking, useActiveTimeLog } from '@/hooks/useJobs';

interface TimeTrackerProps {
  jobId: string;
  variant?: 'full' | 'simple';
}

export default function TimeTracker({ jobId, variant = 'full' }: TimeTrackerProps) {
  const [isStopDialogOpen, setIsStopDialogOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  
  const { data: activeLog } = useActiveTimeLog(jobId);
  const startTracking = useStartTimeTracking();
  const stopTracking = useStopTimeTracking();

  // Atualizar tempo decorrido em tempo real
  useEffect(() => {
    if (!activeLog?.start_time) {
      setElapsedTime('00:00:00');
      return;
    }

    const updateElapsedTime = () => {
      const start = new Date(activeLog.start_time);
      const now = new Date();
      const diff = now.getTime() - start.getTime();
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setElapsedTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateElapsedTime();
    const interval = setInterval(updateElapsedTime, 1000);

    return () => clearInterval(interval);
  }, [activeLog?.start_time]);

  const handleStart = () => {
    startTracking.mutate({ job_id: jobId });
  };

  const handleStop = () => {
    if (activeLog) {
      if (variant === 'simple') {
        // Para versão simples, parar diretamente sem dialog
        stopTracking.mutate(
          { 
            id: activeLog.id, 
            jobId,
            description: undefined 
          },
          {
            onSuccess: () => {
              setDescription('');
            }
          }
        );
      } else {
        // Para versão completa, abrir dialog
        setIsStopDialogOpen(true);
      }
    }
  };

  const handleStopWithDescription = () => {
    if (activeLog) {
      stopTracking.mutate(
        { 
          id: activeLog.id, 
          jobId,
          description: description.trim() || undefined 
        },
        {
          onSuccess: () => {
            setIsStopDialogOpen(false);
            setDescription('');
          }
        }
      );
    }
  };

  // Versão simples para o card
  if (variant === 'simple') {
    if (activeLog) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={handleStop}
          className="text-red-600 border-red-200 hover:bg-red-50 h-6 px-2"
          disabled={stopTracking.isPending}
        >
          <Square className="h-3 w-3" />
        </Button>
      );
    }

    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleStart}
        disabled={startTracking.isPending}
        className="h-6 px-2"
      >
        <Play className="h-3 w-3" />
      </Button>
    );
  }

  // Versão completa
  if (activeLog) {
    return (
      <>
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
          <Clock className="h-4 w-4 text-green-600" />
          <span className="text-sm font-mono text-green-700">
            {elapsedTime}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleStop}
            className="ml-2 text-red-600 border-red-200 hover:bg-red-50"
          >
            <Square className="h-3 w-3 mr-1" />
            Parar
          </Button>
        </div>

        <Dialog open={isStopDialogOpen} onOpenChange={setIsStopDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Parar Contador de Tempo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Tempo trabalhado: {elapsedTime}
                </label>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Descrição do trabalho (opcional)
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o que foi feito..."
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsStopDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleStopWithDescription}
                  disabled={stopTracking.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Parar Contador
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={handleStart}
      disabled={startTracking.isPending}
      className="flex items-center gap-2"
    >
      <Play className="h-4 w-4" />
      Iniciar Contador
    </Button>
  );
}
