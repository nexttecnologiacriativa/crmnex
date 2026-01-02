import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, Facebook, ArrowLeft } from 'lucide-react';

export default function MetaOAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const integrationId = searchParams.get('integration_id');

    if (success === 'true') {
      setStatus('success');
      
      // Redirect to settings after 3 seconds
      setTimeout(() => {
        navigate('/settings', { 
          state: { 
            tab: 'integrations',
            message: 'Integração Meta configurada com sucesso!' 
          } 
        });
      }, 3000);
    } else if (error) {
      setStatus('error');
      
      // Map error codes to user-friendly messages
      const errorMessages: Record<string, string> = {
        'missing_params': 'Parâmetros de autenticação ausentes',
        'integration_not_found': 'Integração não encontrada',
        'token_exchange_failed': 'Falha ao obter token de acesso',
        'update_failed': 'Falha ao atualizar integração',
        'internal_error': 'Erro interno do servidor',
        'access_denied': 'Acesso negado pelo usuário'
      };
      
      setErrorMessage(
        errorDescription || 
        errorMessages[error] || 
        `Erro: ${error}`
      );
    }
  }, [searchParams, navigate]);

  const handleRetry = () => {
    navigate('/settings', { state: { tab: 'integrations' } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Facebook className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <CardTitle>
            {status === 'loading' && 'Conectando ao Meta...'}
            {status === 'success' && 'Conexão Estabelecida!'}
            {status === 'error' && 'Falha na Conexão'}
          </CardTitle>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-blue-600" />
              <p className="text-muted-foreground">
                Aguarde enquanto configuramos sua integração...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
              <div className="space-y-2">
                <p className="text-green-700 font-medium">
                  Sua integração com Meta Lead Ads foi configurada com sucesso!
                </p>
                <p className="text-sm text-muted-foreground">
                  Os formulários foram sincronizados automaticamente.
                  Você será redirecionado em instantes...
                </p>
              </div>
              <Button onClick={() => navigate('/settings', { state: { tab: 'integrations' } })}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Configurações
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 mx-auto text-red-500" />
              <div className="space-y-2">
                <p className="text-red-700 font-medium">
                  Não foi possível completar a autenticação
                </p>
                <p className="text-sm text-muted-foreground">
                  {errorMessage}
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={handleRetry}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar e Tentar Novamente
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}