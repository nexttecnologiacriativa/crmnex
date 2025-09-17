
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, MessageSquare, CheckCircle, Clock, Send, AlertCircle, Calendar } from 'lucide-react';
import { useCampaignAnalytics } from '@/hooks/useMarketingCampaigns';

export default function CampaignAnalytics() {
  const { data: analytics, isLoading } = useCampaignAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Dados de analytics não disponíveis</p>
        </CardContent>
      </Card>
    );
  }

  const failureRate = analytics.totalSent > 0 ? (analytics.totalFailed / analytics.totalSent * 100).toFixed(1) : '0';

  const stats = [
    {
      title: 'Total Enviado',
      value: analytics.totalSent.toLocaleString(),
      icon: Send,
      change: `${analytics.totalCampaigns} campanhas`,
      changeType: 'neutral' as const,
      color: 'text-blue-600'
    },
    {
      title: 'Mensagens Entregues',
      value: analytics.totalDelivered.toLocaleString(),
      icon: CheckCircle,
      change: 'entregues com sucesso',
      changeType: 'increase' as const,
      color: 'text-green-600'
    },
    {
      title: 'Falhas',
      value: analytics.totalFailed.toLocaleString(),
      icon: AlertCircle,
      change: `${failureRate}% do total`,
      changeType: 'decrease' as const,
      color: 'text-red-600'
    }
  ];

  const campaignStats = [
    {
      title: 'Campanhas Ativas',
      value: analytics.activeCampaigns,
      icon: Clock,
      color: 'text-orange-600'
    },
    {
      title: 'Campanhas Agendadas',
      value: analytics.scheduledCampaigns,
      icon: Calendar,
      color: 'text-blue-600'
    },
    {
      title: 'Campanhas Concluídas',
      value: analytics.completedCampaigns,
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      title: 'Total de Campanhas',
      value: analytics.totalCampaigns,
      icon: MessageSquare,
      color: 'text-gray-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Estatísticas de Performance */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Performance das Mensagens</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </div>
                <p className={`text-xs ${
                  stat.changeType === 'increase' ? 'text-green-600' : 
                  stat.changeType === 'decrease' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Estatísticas de Campanhas */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Status das Campanhas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {campaignStats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Resumo Geral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Resumo Geral
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {analytics.totalCampaigns}
              </div>
              <p className="text-sm text-gray-600">Campanhas Criadas</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {analytics.totalSent.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600">Mensagens Enviadas</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 mb-2">
                {analytics.totalFailed.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600">Mensagens Falharam</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detalhes por Campanha */}
      {analytics.campaigns && analytics.campaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Performance por Campanha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.campaigns.map((campaign) => (
                <div key={campaign.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{campaign.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      campaign.status === 'sent' ? 'bg-green-100 text-green-800' :
                      campaign.status === 'sending' ? 'bg-blue-100 text-blue-800' :
                      campaign.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                      campaign.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {campaign.status === 'sent' ? 'Enviado' :
                       campaign.status === 'sending' ? 'Enviando' :
                       campaign.status === 'scheduled' ? 'Agendado' :
                       campaign.status === 'failed' ? 'Falhou' : 'Rascunho'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-gray-900">{campaign.total}</div>
                      <div className="text-gray-500">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-blue-600">{campaign.sent}</div>
                      <div className="text-gray-500">Enviado</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-green-600">{campaign.delivered}</div>
                      <div className="text-gray-500">Entregue</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-purple-600">{campaign.read}</div>
                      <div className="text-gray-500">Lido</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-red-600">{campaign.failed}</div>
                      <div className="text-gray-500">Falhou</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-gray-900">{campaign.deliveryRate}%</div>
                      <div className="text-gray-500">Entrega</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
