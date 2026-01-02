import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Copy, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MetaSetupInstructionsProps {
  webhookUrl?: string;
  verifyToken?: string;
  currentStep?: number;
}

export default function MetaSetupInstructions({ 
  webhookUrl, 
  verifyToken,
  currentStep = 0 
}: MetaSetupInstructionsProps) {
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${label} copiado para a área de transferência`
    });
  };

  const steps = [
    {
      number: 1,
      title: "Criar Aplicativo no Meta",
      description: "Acesse o Meta for Developers e crie um novo aplicativo",
      details: [
        "Acesse developers.facebook.com",
        "Clique em 'Meus Apps' > 'Criar Aplicativo'",
        "Selecione 'Negócios' como tipo",
        "Dê um nome ao app e crie"
      ],
      link: "https://developers.facebook.com/apps/create/",
      linkText: "Criar App no Meta"
    },
    {
      number: 2,
      title: "Configurar Lead Ads",
      description: "Adicione o produto Lead Ads ao seu aplicativo",
      details: [
        "No dashboard do app, vá em 'Adicionar Produtos'",
        "Encontre 'Webhooks' e clique em 'Configurar'",
        "Vá em 'Configurações' > 'Básico' para obter o App ID e App Secret"
      ]
    },
    {
      number: 3,
      title: "Adicionar Integração no CRM",
      description: "Use as credenciais para criar a integração",
      details: [
        "Copie o App ID e App Secret do seu app Meta",
        "Cole nos campos do formulário de criação",
        "Selecione o pipeline de destino dos leads",
        "Clique em 'Conectar com Facebook'"
      ]
    },
    {
      number: 4,
      title: "Configurar Webhook no Meta",
      description: "Configure o webhook para receber leads automaticamente",
      details: [
        "No Meta Developer, vá em 'Webhooks'",
        "Clique em 'Adicionar Assinatura'",
        "Cole a URL do webhook abaixo",
        "Cole o token de verificação",
        "Selecione 'leadgen' nos campos"
      ],
      showWebhook: true
    },
    {
      number: 5,
      title: "Testar a Integração",
      description: "Envie um lead de teste para verificar",
      details: [
        "Na Central de Leads do Meta, envie um lead de teste",
        "O lead deve aparecer no seu pipeline em segundos",
        "Verifique a aba 'Logs' para monitorar"
      ]
    }
  ];

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        Siga os passos abaixo para configurar sua integração com Meta Lead Ads
      </div>

      {steps.map((step, index) => {
        const isCompleted = currentStep > step.number;
        const isCurrent = currentStep === step.number;

        return (
          <Card 
            key={step.number} 
            className={`transition-all ${isCurrent ? 'ring-2 ring-primary' : ''} ${isCompleted ? 'opacity-60' : ''}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${isCompleted ? 'bg-green-100 text-green-700' : isCurrent ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : step.number}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">{step.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                {isCurrent && (
                  <Badge variant="secondary">Atual</Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <ul className="space-y-2 text-sm">
                {step.details.map((detail, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Circle className="w-2 h-2 mt-2 fill-current text-muted-foreground flex-shrink-0" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>

              {step.link && (
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <a href={step.link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3 h-3 mr-2" />
                    {step.linkText}
                  </a>
                </Button>
              )}

              {step.showWebhook && webhookUrl && (
                <div className="mt-4 space-y-3 p-3 bg-muted rounded-lg">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">URL do Webhook</label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 text-xs p-2 bg-background rounded border truncate">
                        {webhookUrl}
                      </code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard(webhookUrl, 'URL do Webhook')}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {verifyToken && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Token de Verificação</label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 text-xs p-2 bg-background rounded border truncate">
                          {verifyToken}
                        </code>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => copyToClipboard(verifyToken, 'Token de Verificação')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-4">
        <ArrowRight className="w-4 h-4" />
        <span>Após configurar, seus leads do Meta aparecerão automaticamente no CRM</span>
      </div>
    </div>
  );
}