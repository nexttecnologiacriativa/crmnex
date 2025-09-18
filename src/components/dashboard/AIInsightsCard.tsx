import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, RefreshCw, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '@/hooks/useWorkspace';

interface AIInsights {
  insights: string;
  metrics?: {
    leads?: number;
    leadsGrowth?: string;
    opportunities?: number;
    conversionRate?: string;
    closedDeals?: number;
    closedValue?: number;
    negotiationLeads?: number;
    avgNegotiationDays?: number;
    stuckLeads?: number;
  };
  lastUpdated: string;
}

export default function AIInsightsCard() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  // Check if OpenAI API key is configured
  const { data: workspaceSettings } = useQuery({
    queryKey: ['workspace-settings', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;
      
      const { data, error } = await supabase
        .from('workspace_settings')
        .select('openai_api_key, ai_insights_pipeline_ids')
        .eq('workspace_id', currentWorkspace.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching workspace settings:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!currentWorkspace?.id,
  });

  const hasApiKey = Boolean(workspaceSettings?.openai_api_key && workspaceSettings.openai_api_key.trim() !== '');
  const selectedPipelinesCount = workspaceSettings?.ai_insights_pipeline_ids?.length || 0;

  const { data: insights, refetch, isLoading, error } = useQuery<AIInsights>({
    queryKey: ['ai-insights', currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('crm-ai-insights', {
        body: { force_refresh: false }
      });
      
      if (error) {
        console.error('Error fetching AI insights:', error);
        throw new Error(error.message || 'Falha ao buscar insights de IA');
      }

      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes in React Query
    gcTime: 10 * 60 * 1000, // Keep in garbage collection for 10 minutes
    refetchOnWindowFocus: false,
    enabled: Boolean(currentWorkspace?.id && hasApiKey),
  });

  const handleRefresh = async () => {
    if (!currentWorkspace?.id) return;
    
    setIsRefreshing(true);
    try {
      console.log('Force refreshing AI insights for workspace:', currentWorkspace.id);
      
      // Call the function with force_refresh to bypass cache
      const { data, error } = await supabase.functions.invoke('crm-ai-insights', {
        body: { force_refresh: true }
      });
      
      if (error) {
        console.error('Error force refreshing insights:', error);
        throw new Error(error.message || 'Falha ao atualizar insights');
      }
      
      console.log('Force refresh successful, updating React Query cache');
      
      // Update cache immediately so UI reflects new data without waiting
      queryClient.setQueryData(['ai-insights', currentWorkspace.id], data);
      
      toast({
        title: "Sucesso",
        description: "Insights atualizados com dados históricos completos!",
      });
    } catch (error) {
      console.error('Error refreshing insights:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao atualizar insights",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatInsights = (text: string) => {
    // Clean text by removing markdown symbols
    const cleanText = text
      .replace(/#{1,6}\s*/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Split into blocks based on the specific titles we expect
    const blocks = [];
    const sections = [
      'Insights sobre Performance de Leads e Conversão',
      'Recomendações Acionáveis', 
      'Alerta ou Oportunidade Identificada'
    ];

    let remainingText = cleanText;
    
    sections.forEach((sectionTitle, index) => {
      const sectionIndex = remainingText.indexOf(sectionTitle);
      if (sectionIndex !== -1) {
        const nextSectionTitle = sections[index + 1];
        let sectionEnd = remainingText.length;
        
        if (nextSectionTitle) {
          const nextIndex = remainingText.indexOf(nextSectionTitle);
          if (nextIndex > sectionIndex) {
            sectionEnd = nextIndex;
          }
        }
        
        const sectionContent = remainingText
          .substring(sectionIndex + sectionTitle.length, sectionEnd)
          .trim();
          
        if (sectionContent) {
          blocks.push({
            title: sectionTitle,
            content: sectionContent
          });
        }
      }
    });

    // If no blocks found, create one default block
    if (blocks.length === 0) {
      blocks.push({
        title: 'Análise de Performance',
        content: cleanText
      });
    }

    return { blocks };
  };

  // Show insights card for all users when API key is configured
  // Show setup message for non-configured workspaces
  if (!hasApiKey) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-blue-600" />
            Insights de IA
            <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
              Não Configurado
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Brain className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Insights de IA não configurados
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Para usar os insights de IA, é necessário configurar uma chave da API OpenAI. 
              Entre em contato com um administrador para configurar.
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/settings?tab=ai'}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 hover:from-blue-700 hover:to-purple-700"
            >
              Ver Configurações de IA
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-red-50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-amber-600" />
            Insights de IA
            <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700">
              Erro
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Brain className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Erro ao carregar insights
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Verifique sua configuração da API OpenAI.
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/settings?tab=ai'}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 hover:from-blue-700 hover:to-purple-700"
            >
              Ir para Configurações
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't show the insights card if still loading or no workspace
  if (isLoading || !currentWorkspace?.id) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-blue-600" />
            Insights de IA
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-blue-600" />
            Insights de IA
            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">
              {selectedPipelinesCount > 0 
                ? `${selectedPipelinesCount} Pipeline${selectedPipelinesCount > 1 ? 's' : ''} - 30 Dias`
                : 'Todos Pipelines - 30 Dias'}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="text-blue-600 hover:text-blue-700"
          >
            <RefreshCw className={`h-4 w-4 ${(isLoading || isRefreshing) ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {insights?.lastUpdated && (
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
            <Clock className="h-3 w-3" />
            Última atualização: {new Date(insights.lastUpdated).toLocaleString('pt-BR')}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
          </div>
        ) : insights ? (
          <div>
            {/* Quick metrics */}
            {insights.metrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-xl font-bold text-blue-600">{insights.metrics.leads || 0}</p>
                  <p className="text-xs text-gray-600">Leads Totais</p>
                  <p className="text-xs text-green-600">+{insights.metrics.leadsGrowth || '0'}%</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-xl font-bold text-purple-600">{insights.metrics.opportunities || 0}</p>
                  <p className="text-xs text-gray-600">Oportunidades</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-xl font-bold text-green-600">{insights.metrics.conversionRate || '0'}%</p>
                  <p className="text-xs text-gray-600">Conversão</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <p className="text-xl font-bold text-orange-600">{insights.metrics.closedDeals || 0}</p>
                  <p className="text-xs text-gray-600">Fechados</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-xl font-bold text-amber-600">{insights.metrics.negotiationLeads || 0}</p>
                  <p className="text-xs text-gray-600">Em Negociação</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-xl font-bold text-red-600">{insights.metrics.avgNegotiationDays || 0}</p>
                  <p className="text-xs text-gray-600">Dias Médio</p>
                </div>
                <div className="text-center p-3 bg-pink-50 rounded-lg">
                  <p className="text-xl font-bold text-pink-600">{insights.metrics.stuckLeads || 0}</p>
                  <p className="text-xs text-gray-600">Leads Parados</p>
                </div>
                <div className="text-center p-3 bg-indigo-50 rounded-lg">
                  <p className="text-xl font-bold text-indigo-600">
                    R$ {(insights.metrics.closedValue || 0).toLocaleString('pt-BR')}
                  </p>
                  <p className="text-xs text-gray-600">Valor Fechado</p>
                </div>
              </div>
            )}

            {/* AI Insights - Block Format */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 mb-3">Análise Inteligente:</h4>
              {(() => {
                const { blocks } = formatInsights(insights.insights);
                const getBlockIcon = (title: string) => {
                  if (title.includes('Performance') || title.includes('Conversão')) {
                    return <TrendingUp className="h-4 w-4 text-blue-600" />;
                  } else if (title.includes('Recomendações') || title.includes('Acionáveis')) {
                    return <CheckCircle className="h-4 w-4 text-green-600" />;
                  } else if (title.includes('Alerta') || title.includes('Oportunidade')) {
                    return <AlertTriangle className="h-4 w-4 text-orange-600" />;
                  }
                  return <Brain className="h-4 w-4 text-purple-600" />;
                };

                const previewBlocks = isExpanded ? blocks : blocks.slice(0, 1);
                const hasMoreBlocks = blocks.length > 1;

                return (
                  <div className="space-y-3">
                    {previewBlocks.map((block, index) => (
                      <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          {getBlockIcon(block.title)}
                          <h5 className="font-medium text-gray-900 text-sm">{block.title}</h5>
                        </div>
                        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                          {block.content}
                        </div>
                      </div>
                    ))}
                    {hasMoreBlocks && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="mt-3 text-blue-600 hover:text-blue-700 p-0 h-auto font-normal"
                      >
                        {isExpanded ? 'Ver menos' : `Ver mais (${blocks.length - 1} blocos)`}
                      </Button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}