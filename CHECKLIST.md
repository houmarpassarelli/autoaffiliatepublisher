# Checklist de Progresso do Projeto - Auto Affiliate Publisher

Este documento compila o status completo de desenvolvimento do projeto **Auto Affiliate Publisher**, categorizado por **Fluxos de Execução**. Cada item possui sua própria caixa de seleção (`- [x]` Implementado no Código, `- [ ]` Pendente, `- [X]` Removido/Substituído) e aponta para o documento de especificação (`.md`) correspondente.

**Estado atual:** monorepo estruturado (Sprint 0 concluído em 08/09/2026) e camada de tempo real no ar (Demanda 2.2 concluída em 09/09/2026). O backend sobe conectado a MongoDB e Redis, com os cinco models e os índices obrigatórios aplicados, expõe a rota `GET /ws` com broadcast e presença ativa, e os dois dashboards já consomem o contrato compartilhado. Os fluxos de ingestão, IA, publicação e curadoria seguem pendentes.

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
*(nenhum item — projeto em fase de especificação)*

### Pendentes
- [ ] **Engine de Ingestão com Scheduler por Fonte** (*`node-cron` disparando a varredura conforme a `cronExpression` cadastrada em cada fonte*) — **Demanda 1.3, Sprint 1**
  *(Ref: [ARQUITETURA.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ARQUITETURA.md#41-módulo-a--ingestão-e-raspagem-worker))*
- [ ] **Ingestor tipo `API`** (*cliente genérico de API de afiliados com credenciais por fonte — caminho preferencial de coleta*)
  *(Ref: [TOOLS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/TOOLS.md#11-apis-oficiais--caminho-preferencial))*
- [ ] **Ingestor tipo `RSS`** (*leitor de feeds XML/RSS/CSV das redes de afiliados — Awin, Rakuten, Lomadee*)
  *(Ref: [TOOLS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/TOOLS.md#12-redes-de-afiliados--feeds-de-produto))*
- [ ] **Ingestor tipo `SCRAPER`** (*raspagem dirigida com Cheerio/Axios para páginas estáticas e Playwright para páginas dinâmicas*)
  *(Ref: [TOOLS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/TOOLS.md#2-bibliotecas-de-ingestão))*
- [ ] **Serviço de Conversão de Link de Afiliado** (*converte a URL do produto na URL rastreada usando a `affiliateTag` da fonte*)
  *(Ref: [ARQUITETURA.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ARQUITETURA.md#3-pipeline-de-ingestão-e-publicação-5-etapas))*
- [ ] **Deduplicação por `dedupeHash` e SKU** (*hash SHA-256 da URL canônica; itens já capturados ou `DISCARDED` são ignorados na ingestão*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#81-deduplicação-na-ingestão))*
- [ ] **Cálculo de Desconto Percentual e Registro de Histórico de Preços** (*`priceHistory` alimentado a cada captura do mesmo item*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#22-coleção-offers--ofertas-coletadas-e-processadas))*
- [ ] **Reverificação de Preço e Disponibilidade Pré-Disparo** (*aborta o disparo se o produto esgotou ou o preço mudou — política de divergência a definir*)
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#92-verificação-pré-disparo))*

---

<a id="categoria-2"></a>
## 2. 🤖 Fluxo de Processamento Inteligente (IA)

### Implementados no Código
*(nenhum item — projeto em fase de especificação)*

### Pendentes
- [ ] **Módulo de Integração com LLM** (*recebe payload estruturado + `aiPromptTemplate` da fonte e retorna as variantes de copy*) — **Demanda 1.4, Sprint 1**
  *(Ref: [ARQUITETURA.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ARQUITETURA.md#42-módulo-b--processamento-inteligente-ia--persistência))*
- [ ] **Geração das 3 Variantes de Copy** (*`messaging` para WhatsApp/Telegram, `social` para Instagram/TikTok, `article` para o site próprio*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#4-estrutura-da-copy-gerada-pela-ia))*
- [ ] **Garantia da Fronteira Arquitetural da IA** (*a IA nunca recebe HTML bruto para extrair nem é instruída a navegar — validação de contrato de entrada*)
  *(Ref: [DOSSIE.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/DOSSIE.md#interacao-1) — Interação 1, Ponto 2)*
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
- [x] **Servidor WebSocket no Fastify com Broadcast** (*rota `GET /ws` sobre `@fastify/websocket`; os seis eventos disponíveis como emissores tipados, com `OPERATOR_CONNECTED` e `OPERATOR_DISCONNECTED` funcionando de ponta a ponta — os outros quatro aguardam os módulos que os disparam*) — **Demanda 2.2, Sprint 2**
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#31-eventos-emitidos-pelo-servidor-broadcast) · Ver [DEVLOG.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/DEVLOG.md), sessão de 09/09/2026)*
- [x] **Controle de Presença Ativa e Validação das Mensagens do Cliente** (*`OPERATOR_CLAIM` com resposta tipada de aceite ou recusa, `HEARTBEAT`, e validação em tempo de execução de tudo que chega pelo socket*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#32-mensagens-enviadas-pelo-cliente))*
- [x] **Índices Obrigatórios do MongoDB** (*`{status,createdAt:-1}`, `{dedupeHash}` único, `{externalSku,sourceId}` e `{operatorId,resolvedAt:-1}` aplicados por `ensureIndexes()` no bootstrap e conferidos no banco*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#22-coleção-offers--ofertas-coletadas-e-processadas))*

### Pendentes
- [ ] **Criptografia das Credenciais em Banco** (*`sources.credentials` e `channels.credentials` — método a definir*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#10-pontos-técnicos-em-aberto))*
- [ ] **Migrar a imagem do MongoDB para a linha 8.x** (*fixada em `mongo:7` no `docker-compose.yml`: as imagens 8.x recusam iniciar nesta máquina com "Linux kernel versions 6.19 and newer has a known incompatibility" — SERVER-121912*)
  *(Ref: [DEVLOG.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/DEVLOG.md), sessão de 08/09/2026, item 5)*

---

<a id="categoria-4"></a>
## 4. 🖥️ Fluxo do Dashboard Administrativo (Local)

### Implementados no Código
*(nenhum item — projeto em fase de especificação)*

### Pendentes
- [ ] **CRUD de Fontes de Coleta** (*nome, tipo, URL, chaves de API, intervalo de varredura e prompt customizado da IA*) — **Demanda 1.2 e 3.1, Sprints 1 e 3**
  *(Ref: [ARQUITETURA.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ARQUITETURA.md#43-módulo-c--dashboard-1-configuração-e-ingestão-local--admin))*
- [ ] **CRUD de Canais de Destino** (*cadastro dinâmico com credenciais, modo de execução e status; reflete no dashboard remoto via `CHANNELS_UPDATED`*)
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#6-seletor-multicanal-por-oferta))*
- [ ] **CRUD de Operadores** (*nome obrigatório, e-mail opcional, sem senha ou token*) — **Demanda 1.2, Sprint 1**
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#71-cadastro-dashboard-administrativo))*
- [ ] **Painel de Auditoria de Disparos** (*tabela com filtros por data, operador, loja de origem e canal — colunas Data/Hora, Operador, Produto, Loja, Preço, Link, Status*)
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#8-rastreamento-de-ações-e-auditoria))*
- [ ] **Disparo Manual de Varredura por Fonte** (*rota `POST /api/sources/:id/run` para testar uma fonte sem esperar o cron*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#9-rotas-http-principais-fastify--zod))*
- [ ] **Interface com Tabler.io + Tailwind, sem animações** (*requisito explícito do usuário: apenas as reações corretas*)
  *(Ref: [TOOLS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/TOOLS.md#7-frontend-dos-dashboards))*

---

<a id="categoria-5"></a>
## 5. 📱 Fluxo do Dashboard Remoto (Curadoria Colaborativa)

### Implementados no Código
*(nenhum item — projeto em fase de especificação)*

### Pendentes
- [ ] **Tela-Portão de Seleção de Operador** (*lista de nomes cadastrados; nomes em uso ficam desabilitados com a marcação "Em uso"*) — **Demanda 3.2, Sprint 3**
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#72-tela-portão-de-seleção-dashboard-remoto))*
- [ ] **Controle de Presença Ativa via WebSocket** (*`OPERATOR_CLAIM`, `OPERATOR_CONNECTED`, `OPERATOR_DISCONNECTED` — libera o nome na desconexão. **Lado servidor concluído em 09/09/2026**; resta o consumo no dashboard remoto, incluindo o envio de `HEARTBEAT` desde a abertura do socket*)
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#73-controle-de-presença-ativa))*
- [ ] **Estrutura de 3 Abas** (*Abertas, Agendadas e Concluídas, espelhando a máquina de estados da oferta*)
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#3-sistema-de-abas-do-dashboard-remoto))*
- [ ] **Card de Oferta** (*imagem, título, preço de/por, desconto percentual, loja de origem e copy da IA*)
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#31-aba-abertas-novas--pendentes))*
- [ ] **Ordenação Decrescente com Inserção no Topo** (*ofertas novas entram no topo da aba Abertas em tempo real, sem recarregar a página*)
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#43-reatividade-sem-recarregamento))*
- [ ] **Seletor Multicanal por Card** (*checkboxes dos canais ativos + opção mestre "Marcar/Desmarcar Todos", todos pré-marcados por padrão*)
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#6-seletor-multicanal-por-oferta))*
- [ ] **Botão "Publicar"** (*envia o payload de comando ao servidor — Thin Client, sem processar envio localmente*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#5-payload-de-comando-de-disparo-thin-client--servidor))*
- [ ] **Botão "Copiar para Área de Transferência"** (*copia a mensagem formatada e sinaliza conclusão — equivalência total com "Publicar"*)
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#5-equivalência-de-ação--copiar-vale-como-publicar))*
- [ ] **Botão "Descartar"** (*status `DISCARDED`, alimentando o histórico anti-recaptura*)
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#21-estados))*
- [ ] **Contagem Regressiva na Aba Agendadas** (*horário previsto de envio, canais selecionados e countdown por item*)
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#32-aba-agendadas-na-fila-de-disparo))*
- [ ] **Sincronização Reativa Completa via WebSocket** (*cards migram entre abas em todas as telas conectadas, sem F5*)
  *(Ref: [FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md#4-estado-global-único-e-controle-de-concorrência))*
- [ ] **Botão "Regenerar Copy"** (*reenvia o payload ao LLM quando o texto gerado não ficou atrativo*)
  *(Ref: [DOSSIE.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/DOSSIE.md#interacao-1) — Interação 1, Ponto 4)*

---

<a id="categoria-6"></a>
## 6. 📤 Fluxo de Publicação Multicanal e Fila de Disparo

### Implementados no Código
*(nenhum item — projeto em fase de especificação)*

### Pendentes
- [ ] **Bloqueio Atômico de Oferta (`findOneAndUpdate` condicional)** (*só a primeira requisição que encontrar a oferta em `OPEN` vence; concorrentes recebem 409 Conflict*) — **Demanda 2.3, Sprint 2**
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#6-bloqueio-atômico-de-oferta-anti-concorrência))*
- [ ] **Fila BullMQ de Disparos com Delay Progressivo** (*fila vazia dispara imediato; fila ocupada escalona a partir do último job*) — **Demanda 2.1, Sprint 2**
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#7-fórmula-do-delay-progressivo-anti-spam))*
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
- [ ] **Driver WhatsApp Canais (modo assistido)** (*mensagem formatada pronta para colar — sem API oficial, sem automação*)
  *(Ref: [TOOLS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/TOOLS.md#41-whatsapp--nota-de-risco-explícita))*
- [ ] **Registro de `DispatchLog` a Cada Ação Resolutiva** (*assinatura do operador, SKU, canais, preço congelado e resultado por canal*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#25-coleção-dispatch_logs--auditoria-e-comissionamento))*
- [ ] **Broadcast `OFFER_PUBLISHED` na Conclusão do Job** (*move o card de Agendadas para Concluídas em todas as telas*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#31-eventos-emitidos-pelo-servidor-broadcast))*

---

<a id="categoria-7"></a>
## 7. 🐛 Fluxo de Bugs

### Abertos
*(nenhum item — projeto ainda sem código)*

### Corrigidos
*(nenhum item — projeto ainda sem código)*

---

<a id="categoria-8"></a>
## 8. 🛡️ Verificações, Validações de Segurança e Decisões em Aberto

### Pendentes
- [ ] **Definir o valor operacional do intervalo do delay progressivo** (*referência inicial de 3 min; levantamento de mercado sugere 30 a 60 min para preservar a audiência*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#7-fórmula-do-delay-progressivo-anti-spam))*
- [ ] **Definir a política de divergência de preço na reverificação pré-disparo** (*abortar e devolver a `OPEN`, ou disparar com o preço atualizado*)
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#82-reverificação-antes-do-disparo))*
- [ ] **Definir o método de criptografia das credenciais em banco**
  *(Ref: [ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md#10-pontos-técnicos-em-aberto))*
- [ ] **Definir a estratégia de exposição segura do Dashboard Remoto** (*VPN, túnel reverso ou proxy com autenticação — o sistema não tem autenticação própria*)
  *(Ref: [TOOLS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/TOOLS.md#8-infraestrutura-local))*
- [ ] **Definir a estratégia de WhatsApp** (*modo exclusivamente assistido, ou adoção de biblioteca não-oficial com o risco de banimento aceito*)
  *(Ref: [TOOLS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/TOOLS.md#41-whatsapp--nota-de-risco-explícita))*
- [ ] **Definir o provedor e modelo de LLM** (*com o custo por oferta processada, insumo direto do modelo de custos*)
  *(Ref: [TOOLS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/TOOLS.md#33-escolha-do-provedor))*
- [ ] **Escolher entre Playwright e Puppeteer** (*evitar manter as duas dependências no projeto*)
  *(Ref: [TOOLS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/TOOLS.md#2-bibliotecas-de-ingestão))*
- [ ] **Verificar compliance de cada programa de afiliados no cadastro da fonte** (*Amazon proíbe links em mensagens privadas fechadas; canais abertos exigem cadastro no perfil de associado*)
  *(Ref: [TOOLS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/TOOLS.md#5-regras-dos-programas-de-afiliados-compliance))*
- [ ] **Avaliar adoção de sub-ID por operador nos links de afiliado** (*transforma a atribuição de comissão de inferida em medida — ver limitações do cruzamento por SKU*)
  *(Ref: [MONETIZACAO.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/MONETIZACAO.md#33-limitações-conhecidas-do-modelo))*

### Concluídas
- [x] **Reconciliação de presença órfã implementada** (*duas salvaguardas: varredor de heartbeat com janela em `WEBSOCKET_HEARTBEAT_TIMEOUT_MS` para queda de rede sem `close` limpo, e reset de presenças no bootstrap para morte abrupta do processo*)
  *(Implementado em 09/09/2026 — ver [DEVLOG.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/DEVLOG.md))*
- [x] **Escolha da biblioteca de WebSocket: `@fastify/websocket`** (*plugin nativo do Fastify, sem servidor paralelo nem protocolo próprio — suficiente para os 6 eventos de broadcast e o controle de presença*)
  *(Decidido em 08/09/2026 — ver [HISTORICO.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/HISTORICO.md))*
- [x] **Escolha da camada de acesso ao MongoDB: Mongoose** (*schemas declarativos com os índices junto do model; a transição atômica por `findOneAndUpdate` permanece disponível*)
  *(Decidido em 08/09/2026 — ver [HISTORICO.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/HISTORICO.md))*
- [x] **Escolha da stack dos dashboards: Vite + React + TypeScript** (*com Tabler.io como kit de componentes, Tailwind CSS sem preflight e regra global que zera animações e transições*)
  *(Decidido em 08/09/2026 — ver [HISTORICO.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/HISTORICO.md))*
