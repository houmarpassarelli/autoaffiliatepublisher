# Arquitetura de Software e Sistemas - Projeto Auto Affiliate Publisher

Este documento compila a arquitetura técnica completa do **Auto Affiliate Publisher**, detalhando a stack, o modelo de aplicação unificada com dois dashboards, o pipeline de ingestão em 5 etapas, a separação rígida entre coleta determinística e refinamento por IA, a comunicação híbrida (REST HTTP + WebSockets permanentes), a fila de disparos com delay progressivo anti-spam e o modelo **Thin Client** de centralização da execução.

---

## 1. Visão Geral da Stack Tecnológica

A aplicação é um **backend único** que expõe duas interfaces distintas. Não há microsserviços separados: os módulos são internos e compartilham o mesmo processo e a mesma base de dados.

| Camada / Módulo | Tecnologia | Papel no Sistema |
| :--- | :--- | :--- |
| **Runtime & Linguagem** | Node.js v20+ / TypeScript (`strict: true`) | Base de toda a aplicação. Preferência declarada por Node puro; Python apenas como *fallback* pontual de scraping complexo. |
| **Servidor HTTP** | Fastify | Roteamento REST, plugins modulares, servir os dois dashboards e receber comandos do cliente remoto. |
| **Validação de Schemas** | Zod | Validação de entradas, payloads e DTOs, integrado ao Fastify via *type provider*. |
| **Banco de Dados** | MongoDB | Persistência de fontes, ofertas, operadores, canais e logs de auditoria. Escolhido pela flexibilidade com payloads semiestruturados de scrapers e alto volume textual. |
| **Tempo Real** | WebSocket (`@fastify/websocket` ou Socket.IO) | Sincronização do estado global de ofertas entre todos os operadores conectados e controle de presença. |
| **Filas & Agendamento** | BullMQ sobre Redis | Fila de disparos com delay progressivo anti-spam, retentativas e concorrência controlada. |
| **Agendamento de Coleta** | Cron interno (`node-cron`) | Dispara a varredura de cada fonte conforme o intervalo configurado em banco. |
| **Ingestão Dinâmica** | Puppeteer / Playwright | Scraping de páginas dinâmicas e SPAs de lojas sem API aberta. |
| **Ingestão Estática** | Cheerio / Axios | Scraping de páginas estáticas e leitura de feeds RSS/XML/CSV. |
| **Inteligência** | LLM via API | Refinamento de copywriting a partir de payload já estruturado. **Nunca** usado para navegar ou extrair. |
| **Frontend (2 Dashboards)** | Tabler.io UI Kit + Tailwind CSS | Interfaces limpas, sem animações pesadas, reativas via WebSocket. |

---

## 2. O Princípio Fundamental: Separação entre Coleta e Inteligência

A regra arquitetural mais importante do projeto, registrada como correção de premissa na Interação 1 do `DOSSIE.md`:

> **A IA não navega, não raspa e não descobre ofertas.**

| Responsabilidade | Executor | Motivo |
| :--- | :--- | :--- |
| Descobrir ofertas | Cliente de API / Leitor de RSS / Scraper | Determinístico, barato, previsível e testável. |
| Extrair título, preço, imagem, SKU | Parser de código | Extração por LLM é cara, lenta e não determinística. |
| Converter em link de afiliado | Serviço de código | Regra fixa por plataforma; não há espaço para variação. |
| **Gerar copy de divulgação** | **LLM via API** | Única etapa onde a variação criativa é desejável. |
| Decidir o que publicar | **Operador humano** | Filtro de relevância e proteção contra erro da IA. |
| Disparar nos canais | *Drivers* de código | Respeito a *rate limits* e credenciais sensíveis. |

---

## 3. Pipeline de Ingestão e Publicação (5 Etapas)

```
[1. COLETA]  Cron dispara por fonte
     │       ├── Cliente de API oficial (Shopee, AliExpress, Amazon, Mercado Livre)
     │       ├── Leitor de Feed (RSS / XML / CSV — Awin, Rakuten, Lomadee)
     │       └── Scraper dirigido (Playwright / Cheerio — lojas sem API)
     ▼
[Dados Brutos: título, preço_de, preço_por, imagem, URL original, SKU]
     │
     ▼
[2. CONVERSÃO DE LINK]  URL do produto ──► URL de afiliado (tag/ID do usuário)
     │
     ▼
[3. REFINAMENTO COM IA]  Payload estruturado ──► LLM (prompt específico da fonte)
     │                   ├── Copy curta com emojis + gatilho de urgência (WhatsApp/Telegram)
     │                   ├── Legenda com hashtags estratégicas (Instagram/TikTok)
     │                   └── Postagem estruturada (Site próprio)
     ▼
[4. PERSISTÊNCIA]  MongoDB ──► offers { status: "aberta" }
     │             └── Deduplicação por SKU externo ou hash da URL
     ▼
[5. CURADORIA HUMANA]  Dashboard Remoto ──► operador revisa e decide
     │
     ├──► "Descartar"  ──► status: "descartada" (alimenta histórico anti-recaptura)
     │
     └──► "Publicar" / "Copiar"
              │
              ▼
     [FILA DE DISPARO — BullMQ com delay progressivo]
              │
              ├────► Driver Telegram      (Bot API — automação total)
              ├────► Driver Site Próprio  (API interna / CMS)
              ├────► Driver Instagram     (Graph API — feed/carrossel)
              ├────► Driver TikTok        (híbrido / preparação de criativo)
              └────► Driver WhatsApp      (assistido via clipboard)
```

---

## 4. Módulos do Sistema

### 4.1. Módulo A — Ingestão e Raspagem (Worker)

Responsável por todos os mecanismos de captura:
- **Consumo de APIs oficiais** de afiliados quando disponíveis (caminho preferencial).
- **Leitura de feeds** RSS/XML/CSV das redes de afiliados.
- **Web scraping dirigido** com Puppeteer/Playwright (páginas dinâmicas) e Cheerio/Axios (páginas estáticas), apontado para páginas específicas de oferta.
- **Agendamento**: Cron jobs internos, configuráveis por fonte via banco de dados (ex.: a cada 1 hora por fonte cadastrada).
- **Reverificação pré-disparo**: antes de publicar em canal público, o sistema revalida preço e disponibilidade — ofertas relâmpago acabam rápido e link quebrado queima a audiência.

### 4.2. Módulo B — Processamento Inteligente (IA & Persistência)

- Recebe o payload bruto (título, preço, descrição, imagem) e o **prompt customizado da fonte** definido no Dashboard Administrativo.
- Retorna copy otimizada por formato de canal.
- Persiste o item com status `aberta`, aplicando deduplicação por `external_sku` ou hash da URL.
- Armazena histórico de preços do item, permitindo identificar se o produto está de fato no menor preço recente.

### 4.3. Módulo C — Dashboard 1: Configuração e Ingestão (Local / Admin)

Roda na máquina administrativa. Concentra tudo que é sensível ou estrutural:
- **CRUD de Fontes**: nome da loja/plataforma, tipo (`api` / `rss` / `scraper`), URL, chaves de API e tokens (criptografados em banco), intervalo de varredura e **prompt customizado da IA** por fonte.
- **CRUD de Canais de Destino**: cadastro dinâmico dos destinos (WhatsApp, Telegram, Instagram, TikTok, Site), com credenciais de envio, status de ativação e parâmetros de formatação. Qualquer alteração reflete imediatamente no Dashboard Remoto.
- **CRUD de Operadores**: cadastro simplificado (nome obrigatório, e-mail opcional, status).
- **Painel de Auditoria**: tabela de logs de disparo com filtros por data, operador, loja de origem e canal de destino.

### 4.4. Módulo D — Dashboard 2: Curadoria e Fila (Remoto / Colaborativo)

Interface de trabalho diário, acessível de qualquer dispositivo. Regras completas em `FLUXO_OPERACIONAL.md`. Resumo arquitetural:
- Três abas espelhando o ciclo de vida: **Abertas**, **Agendadas**, **Concluídas**.
- Cards reativos com foto, preços, desconto calculado, copy da IA, *checkboxes* de canais e botões de ação.
- Sincronização total via WebSocket — sem recarregamento de página.
- **Thin Client**: não processa envios, não guarda tokens de rede social.

### 4.5. Módulo E — Publicação Multicanal (Drivers)

Cada canal tem um *driver* isolado, executado exclusivamente na máquina administrativa:

| Canal | Modo | Observação Arquitetural |
| :--- | :--- | :--- |
| **Telegram** | Automação total | Bot API aberta e gratuita. Disparo imediato. |
| **Site Próprio** | Automação total | Publicação via API interna do CMS ou escrita direta em banco. |
| **Instagram (Feed/Carrossel)** | Automação oficial | Meta Graph API com conta empresarial. **Sem link clicável em legenda.** |
| **Instagram (Stories)** | Híbrido / assistido | Sem automação viável de criativo efêmero. Copiar imagem + legenda. |
| **TikTok** | Híbrido / assistido | Restrições técnicas barram automação direta sem aprovação complexa. |
| **WhatsApp (Canais)** | Assistido (clipboard) | Sem API oficial de postagem em Canais. Publicação manual pelo operador. |

---

## 5. Comunicação Híbrida (REST HTTP + WebSockets Permanentes)

| Tipo de Operação | Protocolo | Exemplos |
| :--- | :--- | :--- |
| **CRUD e configuração** | REST HTTP | Fontes, canais, operadores, consulta de logs, carga inicial das listas. |
| **Estado global reativo** | WebSocket (broadcast) | Chegada de ofertas novas, mudança de estado de oferta, publicação confirmada. |
| **Presença de operadores** | WebSocket | Conexão/desconexão de operador, bloqueio de nomes em uso. |
| **Comando de disparo** | REST HTTP (com eco por WebSocket) | O clique em "Publicar" faz um POST; o resultado é ecoado por broadcast a todos. |

O catálogo completo de eventos e seus payloads está em `ESPECS_TECNICAS.md`.

---

## 6. Arquitetura Thin Client e Roteamento de Execução

O Dashboard Remoto é estritamente uma **interface remota de comando e visualização rápida**. Ele nunca executa a publicação.

```
[Dashboard Remoto — Celular / PC do Operador]
       │
       │ (1) Seleciona canais: [x] Todos | [x] Site [x] WhatsApp [x] Instagram
       │ (2) Clica em "Publicar"
       ▼
[Servidor Principal na Máquina Administrativa]
       │
       ├─► Bloqueia o card via broadcast WebSocket para todos os operadores
       │
       └─► [Fila Central de Disparos — BullMQ com delay progressivo]
                │
                ├────► Driver WhatsApp   (assistido / delay humanizado)
                ├────► Driver Telegram   (imediato via Bot API)
                ├────► Driver Instagram  (Graph API / preparação de criativo)
                ├────► Driver TikTok     (preparação de criativo)
                └────► Driver Site       (inclusão direta no CMS/banco)
```

**Consequências arquiteturais desta decisão:**
- Nenhum token de rede social trafega para fora da máquina administrativa.
- O dashboard remoto pode ser distribuído a colaboradores sem exposição de credenciais.
- Toda execução real acontece num único ponto, simplificando *rate limiting* e auditoria.

---

## 7. Fila de Disparos e Política Anti-Spam

Implementada com **BullMQ sobre Redis**. Regra central:

- **Fila vazia no momento do clique** → o item é disparado imediatamente e migra direto de `aberta` para `concluida`.
- **Fila ocupada** → o item entra em `agendada`, recebendo um delay progressivo em relação ao último job enfileirado (item 1 imediato, item 2 em +Δ, item 3 em +2Δ, e assim por diante), e só migra para `concluida` quando o backend confirmar a publicação.

O intervalo Δ é **parâmetro de balanceamento configurável**, não constante fixa. O valor de referência inicial é de 3 minutos; o levantamento de mercado registrado no `DOSSIE.md` indica que intervalos de 30 a 60 minutos preservam melhor a audiência e reduzem risco de filtro anti-spam. A definição do valor operacional fica para a fase de execução.

---

## 8. Estrutura de Diretórios Proposta

```
├── src/
│   ├── config/              # Configurações de ambiente, MongoDB e Redis
│   ├── database/
│   │   └── models/          # Source, Offer, Operator, Channel, DispatchLog
│   ├── modules/
│   │   ├── ingestion/       # Scrapers (Playwright/Cheerio), clientes de API, leitores RSS
│   │   ├── ai/              # Integração LLM: prompts e formatadores de copy
│   │   ├── dispatcher/      # Drivers de envio (WhatsApp, Telegram, Instagram, TikTok, Site)
│   │   ├── queues/          # Configuração de filas e workers BullMQ
│   │   ├── operators/       # CRUD de operadores e controle de presença ativa
│   │   └── websocket/       # Handlers de eventos em tempo real e broadcast
│   ├── server/              # Instância do Fastify, rotas HTTP e plugins
│   └── client/              # Interfaces Tabler.io (Dashboard Admin e Dashboard Remoto)
└── package.json
```

---

## 9. Visão Consolidada por Camada

| Camada | Módulo Principal | Responsabilidade |
| :--- | :--- | :--- |
| **Ingestão** | Cron / Workers | Scraping, consumo de APIs e leitura de RSS das lojas parceiras. |
| **Inteligência** | Integração com LLM | Geração de copy, formatação por canal e montagem da mensagem final com link de afiliado. |
| **Painel Local** | Dashboard Administrativo | CRUD de fontes, credenciais, intervalos de Cron, prompts da IA, canais de disparo, operadores e auditoria. |
| **Painel Remoto** | Dashboard Colaborativo | Seleção de operador, abas do ciclo de vida, disparo/cópia com sincronização global em tempo real. |
| **Disparo / Fila** | Backend Central | Roteamento multicanal, fila anti-spam com intervalos humanizados e log de auditoria para comissionamento futuro. |
