# Especificações Técnicas e Contratos - Projeto Auto Affiliate Publisher

Este documento compila os schemas de banco de dados, contratos de mensagem WebSocket, payloads de comando, fórmulas de agendamento e regras de deduplicação do projeto **Auto Affiliate Publisher**. É a referência direta para a fase de execução (`INSTRUCAO_EXECUCAO.md`).

---

## 1. Convenção de Nomenclatura

Conforme a regra obrigatória do `INSTRUCAO_EXECUCAO.md`, **todo código é escrito em inglês** e **todos os comentários em Português do Brasil (pt-BR)**.

O material fundacional do projeto (Interação 1 do `DOSSIE.md`) descreve os estados da oferta em português (`aberta`, `agendada`, `concluida`, `descartada`). Registrada aqui a tradução oficial adotada na implementação, preservando os rótulos em português apenas na camada de interface:

| Conceito (Dossiê) | Identificador em Código | Rótulo na UI |
| :--- | :--- | :--- |
| aberta | `OPEN` | Abertas |
| agendada | `SCHEDULED` | Agendadas |
| concluída | `COMPLETED` | Concluídas |
| descartada | `DISCARDED` | Descartadas |
| fonte | `Source` | Fonte |
| oferta | `Offer` | Oferta |
| operador | `Operator` | Operador |
| canal | `Channel` | Canal |
| log de disparo | `DispatchLog` | Log de Disparo |

**Onde os tipos vivem:** os enums, os DTOs em Zod e os contratos de mensagem desta especificação são declarados uma única vez no pacote compartilhado `packages/shared` (`@aap/shared`) e consumidos igualmente pelo backend e pelos dois dashboards. Os *models* do MongoDB, apresentados na Seção 2 com Mongoose, são a camada de persistência e vivem em `apps/api/src/database/models`. A distinção é deliberada: o model trafega `ObjectId` e credenciais; o DTO compartilhado trafega identificadores em texto e **nunca** carrega credenciais.

---

## 2. Esquemas do Banco de Dados (MongoDB)

### 2.1. Coleção `sources` — Fontes de Coleta

```typescript
// apps/api/src/database/models/sourceModel.ts

/**
 * Tipo de mecanismo de coleta utilizado pela fonte.
 * - API:     cliente de API oficial de afiliados (caminho preferencial)
 * - RSS:     leitor de feed RSS/XML/CSV das redes de afiliados
 * - SCRAPER: raspagem dirigida de páginas de oferta de lojas sem API aberta
 */
export enum SourceType {
  API = 'API',
  RSS = 'RSS',
  SCRAPER = 'SCRAPER',
}

export interface SourceDocument {
  _id: ObjectId;
  name: string;                    // Nome da loja/plataforma exibido no painel
  type: SourceType;                // Mecanismo de coleta
  url: string;                     // Endpoint da API, URL do feed ou página de ofertas
  credentials: Record<string, string>; // Chaves e tokens — armazenados criptografados
  affiliateTag: string;            // Tag/ID de afiliado usada na conversão de link
  cronExpression: string;          // Intervalo de varredura (ex.: '0 * * * *')
  aiPromptTemplate: string;        // Instrução específica de como a IA reescreve esta fonte
  active: boolean;                 // Fonte habilitada para varredura
  lastRunAt: Date | null;          // Última execução bem-sucedida da coleta
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.2. Coleção `offers` — Ofertas Coletadas e Processadas

```typescript
// apps/api/src/database/models/offerModel.ts

/**
 * Estados do ciclo de vida da oferta.
 * Regras de transição documentadas em FLUXO_OPERACIONAL.md, Seção 2.
 */
export enum OfferStatus {
  OPEN = 'OPEN',           // Aguardando decisão do operador
  SCHEDULED = 'SCHEDULED', // Aprovada, aguardando o delay anti-spam na fila
  COMPLETED = 'COMPLETED', // Disparada, ou marcada como publicada via clipboard
  DISCARDED = 'DISCARDED', // Rejeitada — alimenta o histórico anti-recaptura
}

/**
 * Registro pontual de preço, usado para saber se o item está de fato
 * no menor preço do período recente (insumo da decisão editorial).
 */
export interface PriceHistoryEntry {
  price: number;
  capturedAt: Date;
}

export interface OfferDocument {
  _id: ObjectId;
  sourceId: ObjectId;              // Referência à fonte que originou a oferta
  externalSku: string;             // ID do produto na loja de origem
  dedupeHash: string;              // Hash da URL original — chave de deduplicação
  title: string;                   // Título original do produto
  originalUrl: string;             // URL do produto na loja
  affiliateUrl: string;            // URL convertida com a tag de afiliado
  imageUrl: string;                // Imagem do produto
  priceOriginal: number;           // Preço "de"
  priceCurrent: number;            // Preço "por"
  discountPct: number;             // Desconto percentual calculado na ingestão
  priceHistory: PriceHistoryEntry[]; // Histórico de preços do item
  aiCopy: Record<string, string>;  // Copy por formato de canal (ver Seção 4)
  status: OfferStatus;
  operatorId: ObjectId | null;     // Preenchido no momento da ação resolutiva
  selectedChannels: string[];      // Canais escolhidos pelo operador no disparo
  scheduledFor: Date | null;       // Horário previsto de disparo (status SCHEDULED)
  createdAt: Date;                 // Data de resgate — base da ordenação decrescente
  resolvedAt: Date | null;         // Momento da ação resolutiva do operador
}
```

**Índices obrigatórios:**

| Índice | Finalidade |
| :--- | :--- |
| `{ status: 1, createdAt: -1 }` | Listagem das abas, com ordenação decrescente por data de resgate. |
| `{ dedupeHash: 1 }` (único) | Deduplicação — impede recaptura do mesmo produto. |
| `{ externalSku: 1, sourceId: 1 }` | Deduplicação secundária por SKU dentro da mesma fonte. |
| `{ operatorId: 1, resolvedAt: -1 }` | Consulta de auditoria por operador. |

### 2.3. Coleção `operators` — Operadores

```typescript
// apps/api/src/database/models/operatorModel.ts

export interface OperatorDocument {
  _id: ObjectId;
  name: string;        // Obrigatório — exibido na tela-portão de seleção
  email: string | null; // Opcional — apenas referência de contato
  active: boolean;     // Operador habilitado a aparecer na seleção
  isOnline: boolean;   // Controlado pela conexão WebSocket (presença ativa)
  createdAt: Date;
  updatedAt: Date;
}
```

> **Nota de segurança:** não existe senha, token ou fluxo de autenticação. A identificação serve exclusivamente para **atribuição de autoria** no comissionamento futuro, não para controle de acesso. O Dashboard Remoto deve, portanto, ficar restrito a rede confiável ou atrás de um proxy com autenticação própria.

### 2.4. Coleção `channels` — Canais de Destino

```typescript
// apps/api/src/database/models/channelModel.ts

/**
 * Modo de execução do canal.
 * - AUTOMATED: driver publica sozinho via API oficial
 * - ASSISTED:  não há API viável — a ação é o "Copiar para Área de Transferência"
 */
export enum ChannelMode {
  AUTOMATED = 'AUTOMATED',
  ASSISTED = 'ASSISTED',
}

export interface ChannelDocument {
  _id: ObjectId;
  key: string;                        // Chave estável usada nos payloads (ex.: 'telegram')
  label: string;                      // Nome exibido no checkbox do card
  mode: ChannelMode;
  credentials: Record<string, string>; // Tokens de envio — nunca trafegam ao cliente remoto
  copyFormatKey: string;              // Qual variante de aiCopy este canal consome
  active: boolean;                    // Desativar oculta o canal do dashboard remoto
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.5. Coleção `dispatch_logs` — Auditoria e Comissionamento

```typescript
// apps/api/src/database/models/dispatchLogModel.ts

/**
 * Natureza da ação resolutiva registrada.
 * Ambas têm o mesmo peso: removem o item da fila global de todos os operadores.
 */
export enum DispatchActionType {
  PUBLISHED_API = 'PUBLISHED_API',         // Disparo automatizado por driver
  COPIED_CLIPBOARD = 'COPIED_CLIPBOARD',   // Publicação assistida via área de transferência
}

export interface DispatchLogDocument {
  _id: ObjectId;
  offerId: ObjectId;
  operatorId: ObjectId;
  operatorName: string;        // Desnormalizado — preserva a autoria mesmo se o operador for removido
  actionType: DispatchActionType;
  channels: string[];          // Chaves dos canais alvo
  productSku: string;          // Chave de cruzamento com os relatórios das plataformas
  affiliateUrl: string;
  priceAtDispatch: number;     // Preço congelado no instante do disparo
  dispatchedAt: Date;
  deliveryStatus: Record<string, string>; // Resultado por canal (sucesso/erro)
}
```

---

## 3. Contratos WebSocket

### 3.1. Eventos Emitidos pelo Servidor (Broadcast)

| Evento | Quando | Payload |
| :--- | :--- | :--- |
| `OFFER_CREATED` | Worker de ingestão finaliza um lote. | `{ offers: OfferDTO[] }` — inseridas no topo da aba Abertas de todos os clientes. |
| `OFFER_STATE_CHANGED` | Operador executa ação resolutiva. | `{ offerId, status, operatorId, operatorName, scheduledFor }` — remove o card de Abertas em todas as telas. |
| `OFFER_PUBLISHED` | A fila processa um agendamento. | `{ offerId, deliveryStatus }` — move o card de Agendadas para Concluídas. |
| `OPERATOR_CONNECTED` | Operador entra pela tela-portão. | `{ operatorId, name }` — desabilita o nome nas telas de entrada dos demais. |
| `OPERATOR_DISCONNECTED` | Socket encerra. | `{ operatorId }` — libera o nome instantaneamente. |
| `CHANNELS_UPDATED` | CRUD de canais no painel administrativo. | `{ channels: ChannelDTO[] }` — atualiza os checkboxes dos cards em tempo real. |

### 3.2. Mensagens Enviadas pelo Cliente

| Mensagem | Finalidade | Payload |
| :--- | :--- | :--- |
| `OPERATOR_CLAIM` | Reivindicar identidade na tela-portão. | `{ operatorId }` → servidor responde com aceite ou `OPERATOR_IN_USE`. |
| `HEARTBEAT` | Manter presença ativa. | `{}` |

> **Nota de robustez:** a presença é derivada do socket vivo. Uma queda de conexão sem `close` limpo pode deixar `isOnline: true` órfão — o *heartbeat* com expiração é o mecanismo previsto para reconciliar esse estado.

---

## 4. Estrutura da Copy Gerada pela IA

O campo `aiCopy` é um mapa de variantes por formato de canal, gerado numa única chamada ao LLM a partir do payload estruturado:

```typescript
// Variantes produzidas pelo módulo de IA a partir do prompt da fonte.
export interface AiCopyVariants {
  messaging: string;  // WhatsApp e Telegram — copy curta, emojis, gatilho de urgência, link
  social: string;     // Instagram e TikTok — legenda com hashtags (link não é clicável no IG)
  article: string;    // Site próprio — postagem estruturada e indexável para SEO
}
```

**Regra de entrada da IA:** o LLM recebe apenas dados já extraídos e validados (título, preços, desconto, especificações, loja) mais o `aiPromptTemplate` da fonte. **Nunca** recebe HTML bruto para extrair, nem é instruído a navegar.

---

## 5. Payload de Comando de Disparo (Thin Client → Servidor)

O Dashboard Remoto não publica. Envia comando:

```json
{
  "offerId": "OFT-2026-8941",
  "productSku": "B09V3KXYZ",
  "operatorId": "usr_02",
  "operatorName": "Carlos Silva",
  "actionType": "PUBLISHED_API",
  "channels": ["whatsapp", "telegram", "instagram", "site"],
  "timestamp": "2026-08-27T01:48:15-03:00"
}
```

**Sequência no servidor ao receber o comando:**
1. Valida o payload com Zod.
2. Executa a **transição atômica de estado** da oferta (ver Seção 6).
3. Emite `OFFER_STATE_CHANGED` em broadcast — o card some da aba Abertas de todos.
4. Grava o `DispatchLog` com a assinatura do operador.
5. Enfileira os jobs por canal na fila BullMQ, aplicando o delay progressivo.

---

## 6. Bloqueio Atômico de Oferta (Anti-Concorrência)

A trava contra publicação duplicada **não pode depender do broadcast**, que é assíncrono. A garantia real é uma escrita condicional no MongoDB:

```typescript
// Transição atômica: só vence a primeira requisição que encontrar a oferta ainda em OPEN.
// Requisições concorrentes recebem null e são rejeitadas com 409 Conflict.
const claimed = await OfferModel.findOneAndUpdate(
  { _id: offerId, status: OfferStatus.OPEN },
  {
    $set: {
      status: nextStatus,          // SCHEDULED ou COMPLETED, conforme o estado da fila
      operatorId,
      selectedChannels,
      resolvedAt: new Date(),
      scheduledFor,
    },
  },
  { returnDocument: 'after' },
);

if (!claimed) {
  // Outro operador já resolveu esta oferta entre o render do card e este clique.
  throw new ConflictError('Oferta já foi resolvida por outro operador.');
}
```

O broadcast WebSocket é a camada de **experiência** (o card some das telas em milissegundos); a escrita condicional é a camada de **correção**.

---

## 7. Fórmula do Delay Progressivo Anti-Spam

```typescript
/**
 * Calcula o instante de disparo de uma oferta recém-aprovada.
 * Regra: fila vazia dispara imediatamente; caso contrário, escalona a partir
 * do último job já agendado, somando o intervalo configurado.
 */
function calculateDispatchTime(lastScheduledAt: Date | null, intervalMs: number): Date {
  const now = new Date();

  // Fila vazia ou último agendamento já vencido: dispara agora (OPEN -> COMPLETED direto).
  if (!lastScheduledAt || lastScheduledAt.getTime() <= now.getTime()) {
    return now;
  }

  // Fila ocupada: entra em SCHEDULED, escalonado após o último job.
  return new Date(lastScheduledAt.getTime() + intervalMs);
}
```

| Parâmetro | Valor de referência | Natureza |
| :--- | :--- | :--- |
| `intervalMs` | 45 minutos (2.700.000 ms) | **Configurável.** Valor operacional adotado com base no levantamento de mercado (`DOSSIE.md`) que recomendava 30 a 60 minutos para preservar a audiência e mitigar riscos anti-spam. |

Enfileiramento no BullMQ segue o padrão baseado em delay:

```typescript
// Job agendado com delay absoluto calculado; sem 'repeat' — é disparo único.
await dispatchQueue.add(
  'DISPATCH_OFFER',
  { offerId, channels, operatorId },
  { delay: Math.max(0, dispatchTime.getTime() - Date.now()) },
);
```

---

## 8. Deduplicação e Reverificação Pré-Disparo

### 8.1. Deduplicação na Ingestão

```typescript
// Chave estável de deduplicação: hash da URL canônica do produto, sem parâmetros de rastreio.
// Evita que a mesma oferta reentre na fila em varreduras subsequentes ou por fontes distintas.
const dedupeHash = createHash('sha256')
  .update(canonicalizeUrl(rawOffer.originalUrl))
  .digest('hex');
```

Ofertas com `dedupeHash` já existente em **qualquer estado** (inclusive `DISCARDED`) são ignoradas na ingestão. O estado `DISCARDED` funciona, portanto, como lista de bloqueio permanente daquele produto.

### 8.2. Reverificação Antes do Disparo

Antes de publicar em canal público, o worker de disparo revalida preço e disponibilidade na origem. Divergência relevante de preço ou produto esgotado deve abortar o disparo e sinalizar o item — link quebrado ou preço desatualizado queima a credibilidade do canal.

> **Nota de escopo:** a política exata em caso de divergência (abortar e devolver a `OPEN`, ou disparar com o preço atualizado) é **decisão em aberto**, a fechar na sessão de execução.

---

## 9. Rotas HTTP Principais (Fastify + Zod)

| Método | Rota | Dashboard | Finalidade |
| :--- | :--- | :--- | :--- |
| `GET/POST/PUT/DELETE` | `/api/sources` | Admin | CRUD de fontes de coleta. |
| `GET/POST/PUT/DELETE` | `/api/channels` | Admin | CRUD de canais de destino. |
| `GET/POST/PUT/DELETE` | `/api/operators` | Admin | CRUD de operadores. |
| `GET` | `/api/logs` | Admin | Auditoria com filtros por data, operador, loja e canal. |
| `POST` | `/api/sources/:id/run` | Admin | Dispara varredura manual de uma fonte. |
| `GET` | `/api/offers?status=OPEN` | Remoto | Carga inicial de cada aba (ordenação `createdAt` decrescente). |
| `POST` | `/api/offers/:id/dispatch` | Remoto | Comando de publicação ou cópia (payload da Seção 5). |
| `POST` | `/api/offers/:id/discard` | Remoto | Descarte da oferta. |
| `GET` | `/api/operators/available` | Remoto | Lista da tela-portão, com marcação de nomes em uso. |

---

## 10. Pontos Técnicos em Aberto

Registrados para resolução na fase de execução:

1. **Valor operacional do `intervalMs`** do delay progressivo (Seção 7). O parâmetro existe no código como a variável de ambiente `DISPATCH_INTERVAL_MS` e o valor foi definido para **45 minutos** (Decisão encerrada).
2. **Política de divergência de preço** na reverificação pré-disparo (Seção 8.2).
3. **Método de criptografia** das credenciais em `sources.credentials` e `channels.credentials`.
4. **Estratégia de WhatsApp**: qual biblioteca/instância não-oficial, se houver, ou modo exclusivamente assistido.
5. **Provedor de LLM** e modelo, com o respectivo custo por oferta processada (ver `MONETIZACAO.md`).
6. **Reconciliação de presença órfã** — expiração do heartbeat para socket caído sem `close` limpo (Seção 3.2).
