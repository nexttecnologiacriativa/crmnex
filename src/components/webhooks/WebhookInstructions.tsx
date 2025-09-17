
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Code, CheckCircle } from 'lucide-react';

export default function WebhookInstructions() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Como Usar Webhooks</h2>
        <p className="text-gray-600 mt-1">
          Guia completo para configurar webhooks e receber leads automaticamente
        </p>
      </div>

      <div className="grid gap-6">
        {/* Elementor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Elementor (WordPress)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-md">
              <h4 className="font-medium text-blue-900 mb-2">Passo a passo:</h4>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>Crie um webhook na aba "Gerenciar" e copie a URL</li>
                <li>No Elementor, edite o formulário desejado</li>
                <li>Vá em "Advanced" → "Actions After Submit"</li>
                <li>Clique em "Add Action" e selecione "Webhook"</li>
                <li>Cole a URL do webhook no campo "Webhook URL"</li>
                <li>Certifique-se que os campos do formulário tenham os nomes corretos</li>
              </ol>
            </div>

            <div>
              <h4 className="font-medium mb-2">Nomes de campos recomendados:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><Badge variant="outline">name</Badge> Nome completo</div>
                <div><Badge variant="outline">email</Badge> E-mail</div>
                <div><Badge variant="outline">phone</Badge> Telefone</div>
                <div><Badge variant="outline">company</Badge> Empresa</div>
                <div><Badge variant="outline">message</Badge> Mensagem</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulários HTML */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Formulário HTML Personalizado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Exemplo de formulário HTML que envia dados para o webhook:
            </p>
            
            <pre className="bg-gray-100 p-4 rounded-md text-xs overflow-x-auto">
              <code>{`<form id="leadForm">
  <input type="text" name="name" placeholder="Nome completo" required>
  <input type="email" name="email" placeholder="E-mail" required>
  <input type="tel" name="phone" placeholder="Telefone">
  <input type="text" name="company" placeholder="Empresa">
  <textarea name="message" placeholder="Mensagem"></textarea>
  <button type="submit">Enviar</button>
</form>

<script>
document.getElementById('leadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);
  
  const response = await fetch('SUA_URL_DO_WEBHOOK', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  });
  
  if (response.ok) {
    alert('Lead enviado com sucesso!');
  }
});
</script>`}</code>
            </pre>
          </CardContent>
        </Card>

        {/* Outras Plataformas */}
        <Card>
          <CardHeader>
            <CardTitle>Outras Plataformas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-medium">Contact Form 7 (WordPress)</h4>
                <p className="text-sm text-gray-600">
                  Use o plugin "CF7 to Webhook" e configure a URL do webhook
                </p>
              </div>
              
              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-medium">Gravity Forms (WordPress)</h4>
                <p className="text-sm text-gray-600">
                  Configure um webhook nos "Form Settings" → "Webhooks"
                </p>
              </div>
              
              <div className="border-l-4 border-purple-500 pl-4">
                <h4 className="font-medium">Typeform</h4>
                <p className="text-sm text-gray-600">
                  Vá em "Connect" → "Webhooks" e adicione a URL do webhook
                </p>
              </div>
              
              <div className="border-l-4 border-orange-500 pl-4">
                <h4 className="font-medium">Zapier</h4>
                <p className="text-sm text-gray-600">
                  Use "Webhooks by Zapier" como ação e configure a URL
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Campos Suportados */}
        <Card>
          <CardHeader>
            <CardTitle>Campos Suportados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <h4 className="font-medium text-green-700 mb-2">Campos Principais:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><Badge variant="outline">name</Badge> ou <Badge variant="outline">nome</Badge></div>
                  <div><Badge variant="outline">email</Badge></div>
                  <div><Badge variant="outline">phone</Badge> ou <Badge variant="outline">telefone</Badge></div>
                  <div><Badge variant="outline">company</Badge> ou <Badge variant="outline">empresa</Badge></div>
                  <div><Badge variant="outline">message</Badge> ou <Badge variant="outline">mensagem</Badge></div>
                  <div><Badge variant="outline">position</Badge> ou <Badge variant="outline">cargo</Badge></div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-blue-700 mb-2">Campos UTM (rastreamento):</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><Badge variant="outline">utm_source</Badge></div>
                  <div><Badge variant="outline">utm_medium</Badge></div>
                  <div><Badge variant="outline">utm_campaign</Badge></div>
                  <div><Badge variant="outline">utm_term</Badge></div>
                  <div><Badge variant="outline">utm_content</Badge></div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-yellow-50 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Nota:</strong> Todos os dados enviados são salvos no campo custom_fields, 
                então você pode enviar campos adicionais que serão preservados.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Teste */}
        <Card>
          <CardHeader>
            <CardTitle>Testando o Webhook</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Você pode testar seu webhook usando curl ou qualquer ferramenta de teste de API:
            </p>
            
            <pre className="bg-gray-100 p-4 rounded-md text-xs overflow-x-auto">
              <code>{`curl -X POST "SUA_URL_DO_WEBHOOK" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "João Silva",
    "email": "joao@exemplo.com",
    "phone": "+55 11 99999-9999",
    "company": "Empresa Teste",
    "message": "Interesse no produto"
  }'`}</code>
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
