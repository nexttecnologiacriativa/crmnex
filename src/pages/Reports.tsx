
import DashboardLayout from '@/components/layout/DashboardLayout';
import ReportsAnalytics from '@/components/reports/ReportsAnalytics';
import { useTeamManagement } from '@/hooks/useTeamManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';

export default function Reports() {
  const { currentUserRole, isLoading } = useTeamManagement();

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-6">
          Relatórios e Analytics
        </h1>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-premium-purple"></div>
          </div>
        ) : currentUserRole === 'admin' || currentUserRole === 'manager' ? (
          <ReportsAnalytics />
        ) : (
          <Card className="mt-6 shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Lock className="h-5 w-5" />
                Acesso Negado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Você não tem permissão para visualizar relatórios. Apenas administradores e gerentes têm acesso.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
