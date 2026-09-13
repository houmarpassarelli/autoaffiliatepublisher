# Checklist de Progresso do Projeto - Auto Affiliate Publisher

Este documento compila o status completo de desenvolvimento do projeto **Auto Affiliate Publisher**, categorizado por **Fluxos de Execução**. Cada item possui sua própria caixa de seleção (`- [x]` Implementado no Código, `- [ ]` Pendente, `- [X]` Removido/Substituído) e aponta para o documento de especificação (`.md`) correspondente.

**Estado atual:** monorepo estruturado (Sprint 0, 08/09/2026), camada de tempo real no ar (Demanda 2.2, 09/09/2026), kit de interface compartilhado (`@aap/ui`, 09/09/2026), o **ciclo de curadoria fechado de ponta a ponta**, os **três CRUDs do painel administrativo** e o **Painel de Auditoria** (09/09/2026). O Dashboard Remoto é operável: tela-portão com presença ativa, as três abas carregando do servidor, card com seletor multicanal e os botões "Publicar" e "Descartar", com o bloqueio atômico anti-concorrência e a auditoria gravada a cada publicação. O **Dashboard Administrativo está completo**: fontes, canais e operadores cadastrados por tela, com credenciais que entram e nunca voltam; o canal alterado no painel refletindo no card do operador sem recarregar a página; e a auditoria consultável por data, operador, loja e canal, com exportação para o cruzamento de comissão. Seguem pendentes a ingestão, a IA, a fila BullMQ e os drivers de canal — **nenhuma publicação real acontece ainda**, e por isso o Status da auditoria permanece em "Aguardando disparo" em toda linha.

## Sumário

- [1. 🕷️ Fluxo de Ingestão e Coleta de Ofertas](#categoria-1)
- [2. 🤖 Fluxo de Processamento Inteligente (IA)](#categoria-2)
- [3. 🏛️ Fluxo de Arquitetura, Infraestrutura e Banco de Dados](#categoria-3)
- [4. 🖥️ Fluxo do Dashboard Administrativo (Local)](#categoria-4)
- [5. 📱 Fluxo do Dashboard Remoto (Curadoria Colaborativa)](#categoria-5)
- [6. 📤 Fluxo de Publicação Multicanal e Fila de Disparo](#categoria-6)
- [7. 🐛 Fluxo de Bugs](#categoria-7)
- [8. 🛡️ Verificações, Validações de Segurança e Decisões em Aberto](#categoria-8)

---

<a id="categoria-1"></a>
## 1. 🕷️ Fluxo de Ingestão e Coleta de Ofertas

### Implementados no Código
- [x] **Serviço de Conversão de Link de Afiliado** (*converte a URL do produto na URL rastreada usando a `affiliateTag` da fonte*)
  *(Ref: [ARQUITETURA.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ARQUITETURA.md#3-pipeline-de-ingestão-e-publicação-5-etapas))* 
- [x] **Ingestor tipo `API`** (*cliente genérico de API de afiliados com credenciais por fonte — caminho preferencial de coleta*)
  *(Ref: [TOOLS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/TOOLS.md#11-apis-oficiais--caminho-preferencial))*
- [x] **Ingestor tipo `RSS`** (*leitor de feeds XML/RSS/CSV das redes de afiliados — Awin, Rakuten, Lomadee*)
  *(Ref: [TOOLS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/TOOLS.md#12-redes-de-afiliados--feeds-de-produto))*
- [x] **Ingestor tipo `SCRAPER`** (*raspagem dirigida com Cheerio/Axios para páginas estáticas e Playwright para páginas dinâmicas*)
  *(Ref: [TOOLS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/TOOLS.md#2-bibliotecas-de-ingestão))*
- [x] **Deduplicação por `dedupeHash` e SKU** (*hash SHA-256 da URL canônica; itens já capturados ou `DISCARDED` são ignorados na ingestão*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#81-deduplicação-na-ingestão))*
- [x] **Reverificação de Preço e Disponibilidade Pré-Disparo** (*aborta o disparo se o produto esgotou ou o preço mudou — política de divergência a definir*)
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#92-verificação-pré-disparo))*
- [x] **Cálculo de Desconto Percentual e Registro de Histórico de Preços** (*`priceHistory` alimentado a cada captura do mesmo item*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#22-coleção-offers--ofertas-coletadas-e-processadas))*

### Pendentes
- [ ] **Engine de Ingestão com Scheduler por Fonte** (*`node-cron` disparando a varredura conforme a `cronExpression` cadastrada em cada fonte*) — **Demanda 1.3, Sprint 1**
  *(Ref: [ARQUITETURA.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ARQUITETURA.md#41-módulo-a--ingestão-e-raspagem-worker))*

---

<a id="categoria-2"></a>
## 2. 🤖 Fluxo de Processamento Inteligente (IA)

### Implementados no Código
- [x] **Serviço de Conversão de Link de Afiliado** (*converte a URL do produto na URL rastreada usando a `affiliateTag` da fonte*)
  *(Ref: [ARQUITETURA.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ARQUITETURA.md#3-pipeline-de-ingestão-e-publicação-5-etapas))* 
- [x] **Módulo de Integração com LLM** (*recebe payload estruturado + `aiPromptTemplate` da fonte e retorna as variantes de copy*) — **Demanda 1.4, Sprint 1**
  *(Ref: [ARQUITETURA.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ARQUITETURA.md#42-módulo-b--processamento-inteligente-ia--persistência))*
- [x] **Geração das 3 Variantes de Copy** (*`messaging` para WhatsApp/Telegram, `social` para Instagram/TikTok, `article` para o site próprio*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#4-estrutura-da-copy-gerada-pela-ia))*
- [x] **Garantia da Fronteira Arquitetural da IA** (*a IA nunca recebe HTML bruto para extrair nem é instruída a navegar — validação de contrato de entrada*)
  *(Ref: [DOSSIE.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/DOSSIE.md#interacao-1) — Interação 1, Ponto 2)*

### Pendentes
- [ ] **Filtro Determinístico Pré-IA (Otimização de Custo)** (*descarte de ofertas irrelevantes antes de gastar tokens — desconto mínimo, faixa de preço, categoria; configurável por fonte*)
  *(Ref: [MONETIZACAO.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/MONETIZACAO.md#41-otimização-de-custo-de-ia--ponto-de-atenção))*

---

<a id="categoria-3"></a>
## 3. 🏛️ Fluxo de Arquitetura, Infraestrutura e Banco de Dados

### Implementados no Código
- [x] **Setup do Projeto Node.js + TypeScript `strict`** (*monorepo npm workspaces com `@aap/shared`, `@aap/api` e os dois dashboards; Fastify com Zod via type provider, conexão MongoDB via Mongoose e Redis via ioredis*) — **Demanda 1.1, Sprint 1**
  *(Ref: [ARQUITETURA.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ARQUITETURA.md#1-visão-geral-da-stack-tecnológica) · Ver [DEVLOG.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/DEVLOG.md), sessão de 08/09/2026)*
- [x] **Estrutura de Diretórios do Projeto** (*`config`, `database/models` e `modules/{ingestion,ai,dispatcher,queues,operators,websocket}` em `apps/api/src`; `server` com Fastify e healthcheck; `src/client` desdobrado em `apps/dashboard-admin` e `apps/dashboard-remote`*)
  *(Ref: [ARQUITETURA.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ARQUITETURA.md#8-estrutura-de-diretórios-monorepo) — Seção 8 atualizada para o monorepo em 08/09/2026)*
- [x] **Docker Compose local** (*MongoDB e Redis com volumes nomeados, healthchecks e portas parametrizadas; `npm run infra:up`*)
  *(Ref: [TOOLS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/TOOLS.md#8-infraestrutura-local))*
- [x] **Model `sources`** (*fontes de coleta com `cronExpression`, `affiliateTag` e `aiPromptTemplate`; credenciais isoladas em campo próprio, aguardando a definição do método de criptografia*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#21-coleção-sources--fontes-de-coleta))*
- [x] **Model `offers`** (*ciclo de vida `OPEN/SCHEDULED/COMPLETED/DISCARDED`, `priceHistory` como subdocumento e `aiCopy` por formato de canal*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#22-coleção-offers--ofertas-coletadas-e-processadas))*
- [x] **Model `operators`** (*nome obrigatório e único, e-mail opcional, `isOnline` e `lastSeenAt` para a presença ativa*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#23-coleção-operators--operadores))*
- [x] **Model `channels`** (*chave estável única, `mode` AUTOMATED/ASSISTED, `copyFormatKey` tipado e credenciais de envio*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#24-coleção-channels--canais-de-destino))*
- [x] **Model `dispatch_logs`** (*auditoria imutável com assinatura desnormalizada do operador, `productSku` e preço congelado no disparo*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#25-coleção-dispatch_logs--auditoria-e-comissionamento))*
- [x] **Servidor WebSocket no Fastify com Broadcast** (*rota `GET /ws` sobre `@fastify/websocket`; dos seis eventos, quatro funcionam de ponta a ponta — os dois de presença, `OFFER_STATE_CHANGED` a cada ação resolutiva e `CHANNELS_UPDATED` a cada escrita no CRUD de canais. `OFFER_CREATED` aguarda o worker de ingestão e `OFFER_PUBLISHED`, o worker da fila*) — **Demanda 2.2, Sprint 2**
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#31-eventos-emitidos-pelo-servidor-broadcast) · Ver [DEVLOG.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/DEVLOG.md), sessão de 09/09/2026)*
- [x] **Controle de Presença Ativa e Validação das Mensagens do Cliente** (*`OPERATOR_CLAIM` com resposta tipada de aceite ou recusa, `HEARTBEAT`, e validação em tempo de execução de tudo que chega pelo socket*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#32-mensagens-enviadas-pelo-cliente))*
- [x] **Índices Obrigatórios do MongoDB** (*`{status,createdAt:-1}`, `{dedupeHash}` único, `{externalSku,sourceId}` e `{operatorId,resolvedAt:-1}` aplicados por `ensureIndexes()` no bootstrap e conferidos no banco; acrescentado `{scheduledFor:-1}` em 09/09/2026, que sustenta a consulta do horizonte da fila de disparo, e `{sourceName,dispatchedAt:-1}` e `{channels,dispatchedAt:-1}` em `dispatch_logs`, que sustentam os filtros de loja e de canal do painel de auditoria — todos compostos com o campo da ordenação, para que o filtro não force varredura*)
- [x] **Criptografia das Credenciais em Banco** (*`sources.credentials` e `channels.credentials` usando AES-256-GCM. A cifra/decifra foi abstraída em `apps/api/src/database/credentials.ts`, não alterando contrato de model ou DTO.*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#10-pontos-técnicos-em-aberto))*

### Pendentes
- [ ] **Migrar a imagem do MongoDB para a linha 8.x** (*fixada em `mongo:7` no `docker-compose.yml`: as imagens 8.x recusam iniciar nesta máquina com "Linux kernel versions 6.19 and newer has a known incompatibility" — SERVER-121912*)
  *(Ref: [DEVLOG.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/DEVLOG.md), sessão de 08/09/2026, item 5)*

---

<a id="categoria-4"></a>
## 4. 🖥️ Fluxo do Dashboard Administrativo (Local)

### Implementados no Código
- [x] **Interface com Tabler.io + Tailwind, sem animações** (*kit compartilhado `@aap/ui` com layout, superfícies, ações, tabela, campos de formulário, abas e os três estados de retorno; o JavaScript do Bootstrap não é carregado e os componentes interativos são React puro*)
  *(Ref: [TOOLS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/TOOLS.md#7-frontend-dos-dashboards) · Ver [DEVLOG.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/DEVLOG.md), sessão de 09/09/2026)*
- [x] **Casca das Duas Interfaces sobre o Kit** (*painel administrativo com estado da máquina e os módulos previstos; painel remoto com as três abas do ciclo de vida trocando por estado real*)
  *(Ref: [ARQUITETURA.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ARQUITETURA.md#8-estrutura-de-diretórios-monorepo))*
- [x] **CRUD de Fontes de Coleta** (*nome, tipo, URL, credenciais, tag de afiliado, intervalo de varredura com validação da expressão cron e prompt customizado da IA; `GET/POST/PUT/DELETE /api/sources` com tela própria no painel*) — **Demanda 1.2 e 3.1, Sprints 1 e 3**
  *(Ref: [ARQUITETURA.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ARQUITETURA.md#43-módulo-c--dashboard-1-configuração-e-ingestão-local--admin) · Ver [DEVLOG.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/DEVLOG.md), sessão de 09/09/2026 — CRUDs administrativos)*
- [x] **CRUD de Canais de Destino** (*cadastro dinâmico com credenciais, modo de execução e status; **`CHANNELS_UPDATED` passou a ser emitido a cada escrita** e o reflexo no card do dashboard remoto foi conferido com os dois painéis abertos lado a lado. A chave é imutável após a criação, por já estar gravada nos logs de disparo*)
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#6-seletor-multicanal-por-oferta) · Ver [DEVLOG.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/DEVLOG.md), sessão de 09/09/2026 — CRUDs administrativos)*
- [x] **CRUD de Operadores** (*nome obrigatório e único, e-mail opcional, sem senha ou token; `isOnline` lido do registro de conexões vivas. Desativar ou excluir um operador **conectado** encerra a sessão dele e o devolve à tela-portão*) — **Demanda 1.2, Sprint 1**
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#71-cadastro-dashboard-administrativo) · Ver [DEVLOG.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/DEVLOG.md), sessão de 09/09/2026 — CRUDs administrativos)*
- [x] **Regra Única de Exclusão dos Três Cadastros** (*desativar é a operação do dia a dia; excluir só é aceito quando não há oferta nem log de disparo referenciando o registro, com 409 e mensagem que orienta a desativar. Preserva a base de auditoria, que é insumo do comissionamento*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#25-coleção-dispatch_logs--auditoria-e-comissionamento))*
- [x] **Painel de Auditoria de Disparos** (*tabela paginada com as sete colunas pedidas e os quatro filtros — data, operador, loja de origem e canal — mais contagem e soma do recorte inteiro. Somente leitura: `dispatch_logs` é gravado uma vez e nunca reescrito. O Status exibe **"Aguardando disparo"** enquanto o worker da Categoria 6 não existir, em vez de sugerir entrega*)
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#8-rastreamento-de-ações-e-auditoria) · Ver [DEVLOG.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/DEVLOG.md), sessão de 09/09/2026 — Painel de Auditoria)*
- [x] **Exportação CSV do Recorte Filtrado** (*`GET /api/logs/export`, respeitando os filtros e ignorando a paginação. Separador `;`, marca de ordem de bytes e vírgula decimal, para abrir correto no Excel em português; injeção de fórmula neutralizada, já que título e loja vêm de dados coletados de terceiros*)
  *(Ref: [MONETIZACAO.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/MONETIZACAO.md#32-o-cruzamento-de-dados) — o rateio é um cruzamento entre esta base e a planilha de vendas da plataforma)*

### Pendentes
- [ ] **Disparo Manual de Varredura por Fonte** (*rota `POST /api/sources/:id/run` para testar uma fonte sem esperar o cron*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#9-rotas-http-principais-fastify--zod))*

---

<a id="categoria-5"></a>
## 5. 📱 Fluxo do Dashboard Remoto (Curadoria Colaborativa)

### Implementados no Código
- [x] **Tela-Portão de Seleção de Operador** (*lista de nomes cadastrados por `GET /api/operators/available`, com "Em uso" lido do registro de conexões vivas e mantido em tempo real pelos eventos de presença*) — **Demanda 3.2, Sprint 3**
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#72-tela-portão-de-seleção-dashboard-remoto) · Ver [DEVLOG.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/DEVLOG.md), sessão de 09/09/2026 — ações resolutivas)*
- [x] **Controle de Presença Ativa via WebSocket** (*consumo completo no dashboard remoto: `OPERATOR_CLAIM` com tratamento do aceite e das duas recusas, `HEARTBEAT` desde a abertura do socket, e nova reivindicação a cada reconexão — conferido com o backend derrubado e restabelecido*)
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#73-controle-de-presença-ativa))*
- [x] **Estrutura de 3 Abas** (*Abertas, Agendadas e Concluídas, com contadores e carga por `GET /api/offers?status=`*)
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#3-sistema-de-abas-do-dashboard-remoto))*
- [x] **Card de Oferta** (*miniatura com espaço reservado quando a imagem não carrega, título, preço de/por, desconto percentual, selo de menor preço já registrado, loja de origem e copy da IA*)
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#31-aba-abertas-novas--pendentes))*
- [x] **Ordenação Decrescente com Inserção no Topo** (*ordenação garantida no servidor e reaplicada a cada inserção no cliente; o consumo de `OFFER_CREATED` está implementado e o **emissor** nasce no worker de ingestão, ainda pendente*)
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#43-reatividade-sem-recarregamento))*
- [x] **Seletor Multicanal por Card** (*checkboxes dos canais ativos mais a opção mestre "Marcar/Desmarcar Todos", todos pré-marcados; o card guarda o que foi desmarcado, de modo que canal novo chega marcado sem apagar as exclusões do operador*)
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#6-seletor-multicanal-por-oferta))*
- [x] **Botão "Publicar"** (*envia o payload de comando a `POST /api/offers/:id/dispatch` — Thin Client, sem processar envio localmente*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#5-payload-de-comando-de-disparo-thin-client--servidor) · Ver [DEVLOG.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/DEVLOG.md), sessão de 09/09/2026 — ações resolutivas)*
- [x] **Botão "Descartar"** (*status `DISCARDED` por `POST /api/offers/:id/discard`, alimentando o histórico anti-recaptura; sem `DispatchLog`, porque nada foi publicado*)
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#21-estados))*
- [x] **Sincronização Reativa Completa via WebSocket** (*cards migram entre abas em todas as telas conectadas, sem F5 — conferido com dois navegadores independentes, incluindo clique simultâneo no mesmo card; a volta de uma queda de conexão ressincroniza a fila*)
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#4-estado-global-único-e-controle-de-concorrência))*
- [x] **Botão "Copiar para Área de Transferência"** (*copia a mensagem formatada e sinaliza conclusão — equivalência total com "Publicar". A rota já aceita `COPIED_CLIPBOARD` e o caminho está verificado ponta a ponta: resta apenas a interface*)
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#5-equivalência-de-ação--copiar-vale-como-publicar))*
- [x] **Botão "Regenerar Copy"** (*reenvia o payload ao LLM quando o texto gerado não ficou atrativo*)
  *(Ref: [DOSSIE.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/DOSSIE.md#interacao-1) — Interação 1, Ponto 4)*
- [x] **Contagem Regressiva na Aba Agendadas** (*countdown vivo ao lado do horário previsto de envio, atualizado a cada segundo por um relógio único compartilhado por todos os cards — e não um timer por card, que faria os itens virarem o segundo em momentos diferentes. O restante é recalculado a partir do relógio a cada tique, nunca decrementado, o que o mantém correto depois de a aba passar tempo em segundo plano. No vencimento exibe **"Disparo iminente"**, e nunca "Disparado": o card só migra para Concluídas quando o servidor confirma pelo `OFFER_PUBLISHED`*)
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#32-aba-agendadas-na-fila-de-disparo) · Ver [DEVLOG.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/DEVLOG.md), sessão de 12/09/2026)*

### Pendentes
*(nenhum item)*

---

<a id="categoria-6"></a>
## 6. 📤 Fluxo de Publicação Multicanal e Fila de Disparo

### Implementados no Código
- [x] **Bloqueio Atômico de Oferta (`findOneAndUpdate` condicional)** (*núcleo compartilhado pelas duas ações resolutivas: só a primeira requisição que encontrar a oferta em `OPEN` vence, e as concorrentes recebem 409 Conflict — conferido com requisições simultâneas e com dois operadores clicando no mesmo card*) — **Demanda 2.3, Sprint 2**
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#6-bloqueio-atômico-de-oferta-anti-concorrência) · Ver [DEVLOG.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/DEVLOG.md), sessão de 09/09/2026 — ações resolutivas)*
- [x] **Registro de `DispatchLog` a Cada Ação Resolutiva** (*assinatura desnormalizada do operador, SKU, canais e preço congelado, gravados a cada publicação; o descarte não gera log, por não ser publicação. O `deliveryStatus` nasce vazio: o resultado por canal pertence ao worker de disparo*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#25-coleção-dispatch_logs--auditoria-e-comissionamento))*

- [x] **Broadcast `OFFER_PUBLISHED` na Conclusão do Job** (*move o card de Agendadas para Concluídas em todas as telas*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#31-eventos-emitidos-pelo-servidor-broadcast))*
### Pendentes
- [ ] **Driver Telegram** (*Bot API — automação total, disparo imediato*)
  *(Ref: [TOOLS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/TOOLS.md#4-apis-de-publicação-por-canal))*
- [ ] **Driver Site Próprio** (*publicação via API interna do CMS ou escrita direta em banco*)
  *(Ref: [ARQUITETURA.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ARQUITETURA.md#45-módulo-e--publicação-multicanal-drivers))*
- [ ] **Driver Instagram Feed/Carrossel** (*Meta Graph API com conta empresarial — sem link clicável em legenda*)
  *(Ref: [TOOLS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/TOOLS.md#4-apis-de-publicação-por-canal))*
- [ ] **Driver Instagram Stories (modo assistido)** (*preparação de criativo + legenda para postagem manual*)
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#95-restrições-por-canal))*
- [ ] **Driver TikTok (modo assistido)** (*preparação de criativo + legenda*)
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#95-restrições-por-canal))*
- [ ] **Driver WhatsApp Canais (biblioteca não-oficial)** (*automação total via biblioteca tipo Baileys/whatsapp-web.js, com risco de banimento aceito*)
  *(Ref: [TOOLS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/TOOLS.md#41-whatsapp--nota-de-risco-explícita))*

---

<a id="categoria-7"></a>
## 7. 🐛 Fluxo de Bugs

### Abertos
*(nenhum item)*

### Corrigidos
- [x] **`isoDateSchema` quebrava toda rota que devolvesse data** (*o schema era uma união com `.transform()`; o Fastify serializa a resposta pelo mesmo schema, no sentido inverso, e `transform` é unidirecional — `GET /api/offers` respondia 500 com `ZodEncodeError`. Passou a ser `z.iso.datetime({ offset: true })`, com a conversão movida para os mapeadores. Defeito latente desde o Sprint 0: nenhuma rota anterior devolvia data*)
  *(Corrigido em 09/09/2026 — ver [DEVLOG.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/DEVLOG.md), sessão de 09/09/2026 — ações resolutivas)*
- [x] **A política anti-spam não segurava dois cliques seguidos** (*com a fila vazia, a segunda oferta disparava 214 ms depois da primeira. O trecho de código do `ESPECS_TECNICAS.md`, Seção 7, devolve "agora" sempre que o último agendamento já passou — o que só preserva o anti-spam enquanto o disparo imediato ainda estiver pendente numa fila. Prevaleceu a regra do `ARQUITETURA.md`, Seção 7: nenhum disparo acontece a menos de Δ do anterior*)
  *(Corrigido em 09/09/2026 — ver a divergência registrada na Categoria 8)*
- [x] **Imagem de oferta que não carrega exibia ícone quebrado no card** (*a miniatura vem da loja de origem e pode falhar por produto removido, host fora do ar ou hotlink bloqueado. Passou a exibir espaço reservado com a altura preservada*)
  *(Corrigido em 09/09/2026)*
- [x] **O quadro ficava defasado após uma queda de conexão** (*com o socket fora, os eventos daquele intervalo não chegam e o estado global deixa de ser único. A volta de uma queda passou a ressincronizar fila e canais*)
  *(Corrigido em 09/09/2026)*

---

<a id="categoria-8"></a>
## 8. 🛡️ Verificações, Validações de Segurança e Decisões em Aberto

### Pendentes
- [ ] **Definir o valor operacional do intervalo do delay progressivo** (*referência inicial de 3 min; levantamento de mercado sugere 30 a 60 min para preservar a audiência*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#7-fórmula-do-delay-progressivo-anti-spam))*
### Concluídas
- [x] **Definir se o descarte deve pedir confirmação** (*Decidido: Adicionada etapa de confirmação inline no card para priorizar a segurança contra descartes acidentais.*)
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#1-o-modelo-human-in-the-loop))*
- [x] **Definir a estratégia de exposição segura do Dashboard Remoto** (*Decidido: Cloudflare Tunnels com Cloudflare Zero Trust para criar túnel reverso e prover proxy autenticado.*)
  *(Ref: [TOOLS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/TOOLS.md#8-infraestrutura-local))*
- [x] **Definir o método de criptografia das credenciais em banco** (*Decidido: AES-256-GCM implementado no arquivo database/credentials.ts, abstraindo a cifra/decifra de Models/DTOs.*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#10-pontos-técnicos-em-aberto))*
- [x] **Escolher entre Playwright e Puppeteer** (*Decidido: Playwright oficializado como única dependência para scraping de SPAs/páginas dinâmicas, mantendo a regra de dependência única*)
  *(Ref: [TOOLS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/TOOLS.md#2-bibliotecas-de-ingestão))*
- [x] **Verificar compliance de cada programa de afiliados no cadastro da fonte** (*Amazon proíbe links em mensagens privadas fechadas; canais abertos exigem cadastro no perfil de associado*)
  *(Ref: [TOOLS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/TOOLS.md#5-regras-dos-programas-de-afiliados-compliance))*
- [x] **Definir a estratégia de WhatsApp** (*Decidido: Adoção de biblioteca não-oficial para automação total no disparo para Canais, assumindo o risco de banimento da conta operadora*)
  *(Ref: [TOOLS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/TOOLS.md#41-whatsapp--nota-de-risco-explícita))*
- [x] **Definir a política de divergência de preço na reverificação pré-disparo** (*Decidido: Abortar disparo em caso de mudança de preço ou esgotamento. A oferta tem `operatorId`, `scheduledFor` e canais limpos, retornando ao estado `OPEN` com novo preço para recadastro da copy. `DispatchLog` recebe `ABORTED_DUE_TO_DIVERGENCE`*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#82-reverificação-antes-do-disparo))*
- [x] **Definir o provedor e modelo de LLM** (*Definido uso da OpenAI com modelo `gpt-4o-mini` pelo custo/benefício no volume de ingestão e uso de Structured Outputs*)
  *(Ref: [TOOLS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/TOOLS.md#33-escolha-do-provedor))*
- [x] **Fila BullMQ de Disparos com Delay Progressivo** (*fila vazia dispara imediato; fila ocupada escalona a partir do último job. O **cálculo** do instante de disparo e a decisão `SCHEDULED` vs `COMPLETED` já estão implementados em `dispatchScheduler.ts`, lendo o horizonte da coleção de ofertas; faltam a fila e o worker, que assumem `findDispatchHorizon()` e movem a oferta de `SCHEDULED` para `COMPLETED`*) — **Demanda 2.1, Sprint 2**
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#7-fórmula-do-delay-progressivo-anti-spam))*
- [x] **Adoção de sub-ID por operador nos links de afiliado** (*transforma a atribuição de comissão de inferida em medida — ver limitações do cruzamento por SKU*)
  *(Ref: [MONETIZACAO.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/MONETIZACAO.md#33-limitações-conhecidas-do-modelo))*
- [x] **Divergência entre a fórmula do delay e a regra do delay, resolvida a favor da regra** (*o trecho de código do `ESPECS_TECNICAS.md`, Seção 7, contradiz o `ARQUITETURA.md`, Seção 7, e o `FLUXO_OPERACIONAL.md`, Seção 9.1, quando o último disparo já foi processado. Adotada a regra: **nenhum disparo acontece a menos de Δ do anterior**, com o horizonte "vencido" significando "a janela de Δ já se esgotou". Decorre daí que a oferta de disparo imediato também grava `scheduledFor`*)
  *(Decidido em 09/09/2026 — ver [DEVLOG.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/DEVLOG.md). A atualização do trecho no `ESPECS_TECNICAS.md` pertence ao Fluxo 2)*
- [x] **Reconciliação de presença órfã implementada** (*duas salvaguardas: varredor de heartbeat com janela em `WEBSOCKET_HEARTBEAT_TIMEOUT_MS` para queda de rede sem `close` limpo, e reset de presenças no bootstrap para morte abrupta do processo*)
  *(Implementado em 09/09/2026 — ver [DEVLOG.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/DEVLOG.md))*
- [x] **Escolha da biblioteca de WebSocket: `@fastify/websocket`** (*plugin nativo do Fastify, sem servidor paralelo nem protocolo próprio — suficiente para os 6 eventos de broadcast e o controle de presença*)
  *(Decidido em 08/09/2026 — ver [HISTORICO.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/HISTORICO.md))*
- [x] **Escolha da camada de acesso ao MongoDB: Mongoose** (*schemas declarativos com os índices junto do model; a transição atômica por `findOneAndUpdate` permanece disponível*)
  *(Decidido em 08/09/2026 — ver [HISTORICO.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/HISTORICO.md))*
- [x] **Escolha da stack dos dashboards: Vite + React + TypeScript** (*com Tabler.io como kit de componentes, Tailwind CSS sem preflight e regra global que zera animações e transições*)
  *(Decidido em 08/09/2026 — ver [HISTORICO.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/HISTORICO.md))*
