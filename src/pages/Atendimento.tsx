import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';
import UnifiedAtendimento from '@/components/whatsapp/UnifiedAtendimento';
import { useWorkspace } from '@/hooks/useWorkspace';

export default function Atendimento() {
  const { currentWorkspace } = useWorkspace();

  return (
    <DashboardLayout>
      <div className="space-y-6 mt-4">
        {/* Interface Unificada */}
        <UnifiedAtendimento />
      </div>
    </DashboardLayout>
  );
}
