# Configuração Evolution API Webhook

Este documento explica como configurar o webhook da Evolution API para receber mensagens do WhatsApp.

## Variáveis de Ambiente Necessárias

Configure as seguintes variáveis no Supabase (Edge Functions Secrets):

### Para receber webhooks:
- `EVOLUTION_WEBHOOK_TOKEN` - Token secreto para validar webhooks

### Para enviar mensagens:
- `EVO_SERVER_URL` - URL do servidor Evolution API (ex: https://api.evolution.com)
- `EVO_INSTANCE_ID` - ID da instância do WhatsApp
- `EVO_API_KEY` - Chave da API Evolution

## Configuração do Webhook

1. **URL do Webhook**: Configure na Evolution API para enviar para:
   ```
   https://[SEU-PROJETO].supabase.co/functions/v1/api-evolution?token=[SEU_TOKEN]
   ```

2. **Evento**: Configure para o evento `messages.upsert`

## Estrutura da Tabela

A tabela `whatsapp_webhook_messages` armazena:
- `id` - UUID primary key
- `thread_id` - ID da conversa (remoteJid)
- `from_me` - Se a mensagem foi enviada por nós
- `push_name` - Nome do contato
- `message_type` - Tipo da mensagem
- `text` - Conteúdo de texto
- `timestamp` - Timestamp da mensagem
- `custom_fields` - Campos personalizados (JSONB)
- `raw` - Dados brutos completos (JSONB)

## Como Usar

### Enviar uma resposta via WhatsApp:

```typescript
import { useSendWhatsAppReply } from '@/hooks/useEvolutionWebhook';

function ChatComponent() {
  const sendReply = useSendWhatsAppReply();

  const handleSendMessage = async () => {
    try {
      await sendReply.mutateAsync({
        threadId: '5512999999999@s.whatsapp.net',
        text: 'Olá! Esta é uma mensagem automática.',
        customFields: {
          leadId: 'abc123',
          campaign: 'promo2024',
          source: 'website'
        }
      });
      console.log('Mensagem enviada com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  return (
    <button onClick={handleSendMessage}>
      Enviar Mensagem
    </button>
  );
}
```

### Buscar mensagens:

```typescript
import { useWebhookMessages } from '@/hooks/useEvolutionWebhook';

function MessagesComponent() {
  const getMessages = useWebhookMessages();

  const handleLoadMessages = async () => {
    try {
      const messages = await getMessages.mutateAsync('5512999999999@s.whatsapp.net');
      console.log('Mensagens:', messages);
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
    }
  };

  return (
    <button onClick={handleLoadMessages}>
      Carregar Mensagens
    </button>
  );
}
```

## Campos Personalizados

O webhook suporta campos personalizados que podem ser enviados de duas formas:

### 1. No corpo da requisição:
```json
{
  "data": {
    "remoteJid": "5512999999999@s.whatsapp.net",
    "fromMe": false,
    "messageType": "conversation",
    "message": {
      "conversation": "Olá!"
    }
  },
  "customFields": {
    "leadId": "abc123",
    "campaign": "promo2024",
    "source": "website",
    "priority": "high"
  }
}
```

### 2. Diretamente nos dados da mensagem:
```json
{
  "data": {
    "remoteJid": "5512999999999@s.whatsapp.net",
    "fromMe": false,
    "messageType": "conversation",
    "message": {
      "conversation": "Olá!"
    },
    "customFields": {
      "leadId": "abc123",
      "department": "vendas"
    }
  }
}
```

### Consultar por campos personalizados:
```typescript
// Buscar mensagens com campo específico
const { data, error } = await supabase
  .from('whatsapp_webhook_messages')
  .select('*')
  .contains('custom_fields', { leadId: 'abc123' });

// Buscar por valor em custom_fields
const { data, error } = await supabase
  .from('whatsapp_webhook_messages')
  .select('*')
  .eq('custom_fields->leadId', 'abc123');
```

## Fluxo de Funcionamento

1. **Recebimento**: Evolution API envia webhook para `/api-evolution`
2. **Validação**: Token é verificado via querystring
3. **Processamento**: Dados são extraídos e salvos no Supabase
4. **Armazenamento**: Mensagem é salva na tabela `whatsapp_webhook_messages`
5. **Resposta**: Sistema pode responder via `/send-whatsapp-reply`

## Logs e Debugging

- Verifique os logs das Edge Functions no Supabase Dashboard
- Todas as operações são logadas para facilitar o debugging
- Dados brutos são armazenados na coluna `raw` para análise

## Segurança

- Token de webhook é obrigatório
- Todas as requests são validadas
- RLS habilitado na tabela
- CORS configurado adequadamente