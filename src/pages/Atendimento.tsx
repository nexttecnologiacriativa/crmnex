import DashboardLayout from '@/components/layout/DashboardLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import UnifiedAtendimento from '@/components/whatsapp/UnifiedAtendimento';
import { useWhatsAppInstances } from '@/hooks/useWhatsAppInstance';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

export default function Atendimento() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Usa o hook que filtra instâncias por usuário
  const { data: whatsappInstances = [], isLoading } = useWhatsAppInstances();

  // Processar dados do sessionStorage quando vindo do Outbound em nova aba
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('from') === 'outbound') {
      const outboundData = sessionStorage.getItem('outbound-conversation');
      if (outboundData) {
        try {
          const data = JSON.parse(outboundData);
          // Os dados serão processados pelo UnifiedAtendimento via location.state
          // Simular o state do navigate
          Object.assign(location, { state: data });
          sessionStorage.removeItem('outbound-conversation');
        } catch (e) {
          console.error('Erro ao processar dados do outbound:', e);
        }
      }
    }
  }, [location]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!whatsappInstances || whatsappInstances.length === 0) {
    return (
      <DashboardLayout>
        <div className="space-y-6 mt-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Atendimento não disponível</AlertTitle>
            <AlertDescription>
              Nenhuma instância WhatsApp encontrada. Crie uma instância nas configurações para usar o Atendimento.
            </AlertDescription>
          </Alert>
          <div className="flex justify-center">
            <Button onClick={() => navigate('/settings')}>
              Ir para Configurações
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 mt-4">
        <UnifiedAtendimento />
      </div>
    </DashboardLayout>
  );
}
