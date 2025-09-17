# Configuração da Google Places API para Outbound

Para usar a funcionalidade de busca de empresas no módulo Outbound, você precisa configurar a Google Places API.

## Passos para configuração:

### 1. Criar um projeto no Google Cloud Console
- Acesse: https://console.cloud.google.com/
- Crie um novo projeto ou selecione um existente

### 2. Habilitar a Places API
- No painel do Google Cloud Console, vá para "APIs & Services" > "Library"
- Procure por "Places API" e clique em "Enable"

### 3. Criar uma chave de API
- Vá para "APIs & Services" > "Credentials"
- Clique em "Create Credentials" > "API Key"
- Copie a chave gerada

### 4. Configurar restrições (recomendado)
- Na página de credentials, clique na sua API key
- Em "Application restrictions", selecione "HTTP referrers"
- Adicione o domínio do seu site (ex: https://seudominio.com/*)
- Em "API restrictions", selecione "Restrict key" e escolha "Places API"

### 5. Configurar no código
- No arquivo `src/pages/Outbound.tsx`, linha 54, substitua `YOUR_GOOGLE_PLACES_API_KEY` pela sua chave real
- Para produção, é recomendado usar variáveis de ambiente através de Supabase Edge Functions

## Estrutura da resposta da API

A Google Places API retorna dados no seguinte formato:

```json
{
  "results": [
    {
      "place_id": "ChIJ...",
      "name": "Nome da Empresa",
      "formatted_address": "Endereço completo",
      "formatted_phone_number": "(11) 99999-9999",
      "website": "https://website.com",
      "rating": 4.5,
      "user_ratings_total": 123
    }
  ],
  "status": "OK"
}
```

## Custos

- A Google Places API oferece $200 em créditos gratuitos por mês
- Text Search custa aproximadamente $32 por 1000 requisições
- Para mais informações sobre preços: https://cloud.google.com/maps-platform/pricing

## Alternativa para desenvolvimento

O sistema já inclui dados mock para desenvolvimento e demonstração. Se a API não estiver configurada ou atingir o limite, ele automaticamente usará dados de exemplo.

## Implementação em produção

Para produção, considere:
1. Implementar rate limiting
2. Cache de resultados para evitar consultas repetidas
3. Monitoramento de uso da API
4. Configurar alertas de limite de cota