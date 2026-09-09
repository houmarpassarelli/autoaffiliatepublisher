# Histórico de Planos de Execução

Registro dos planos aprovados pelo solicitante antes de cada sessão de execução de código, conforme `INSTRUCAO_EXECUCAO.md`, Seção 3.

---

## 2026-09-08 — 14:32 — Sprint 0: Estruturação do Monorepo

**Contexto:** o projeto encontrava-se em fase exclusivamente documental, sem nenhuma linha de código. O solicitante determinou o início do desenvolvimento a partir das tasks de estruturação já definidas no `CHECKLIST.md`, com a exigência adicional de que o projeto fosse organizado como **monorepo**.

**Escopo aprovado — 9 tasks da Categoria 3 do `CHECKLIST.md`:**

1. Setup do Projeto Node.js + TypeScript `strict` (Demanda 1.1, Sprint 1)
2. Estrutura de Diretórios do Projeto
3. Docker Compose local (MongoDB + Redis)
4. Model `sources`
5. Model `offers`
6. Model `operators`
7. Model `channels`
8. Model `dispatch_logs`
9. Índices Obrigatórios do MongoDB

**Fora de escopo desta sessão:** criptografia de credenciais (decisão em aberto da Categoria 8), servidor WebSocket com broadcast (Sprint 2), ingestores, drivers de canal, módulo de IA, fila BullMQ e os CRUDs dos dashboards. A estrutura nasce preparada para receber todos eles.

**Arquitetura aprovada:** monorepo com npm workspaces, dividido em `packages/shared` (enums, schemas Zod e contratos WebSocket compartilhados entre backend e dashboards), `apps/api` (backend único Fastify, preservando 1:1 os diretórios do `ARQUITETURA.md` Seção 8) e os dois dashboards (`apps/dashboard-admin` e `apps/dashboard-remote`), que substituem o diretório `src/client` da proposta original.

**Decisões técnicas fechadas pelo solicitante nesta sessão:**

| Decisão | Escolha | Efeito no `CHECKLIST.md` |
| :--- | :--- | :--- |
| Stack dos dashboards | Vite + React + TypeScript, com Tabler.io + Tailwind CSS e sem animações | — |
| Camada de acesso ao MongoDB | Mongoose | — |
| Biblioteca de WebSocket | `@fastify/websocket` | Encerra a decisão em aberto "Escolher entre `@fastify/websocket` e Socket.IO" (Categoria 8) |

**Divergência registrada:** o `ARQUITETURA.md`, Seção 8, descreve uma estrutura de projeto único (`src/...`), incompatível com a exigência de monorepo. O mapeamento adotado preserva integralmente os nomes e as fronteiras dos módulos. A atualização daquele documento pertence ao Fluxo 2 (`INSTRUCAO_DOSSIE.md`) e **não foi realizada nesta sessão de execução**.

**Observação de processo:** a skill `gauntlet-loop`, exigida pelo `INSTRUCAO_EXECUCAO.md`, Seção 3.5, não existe no repositório (`.claude/skills/` ausente). A sessão seguiu sem ela.

---

## 2026-09-09 — 02:30 — Demanda 2.2: Servidor WebSocket no Fastify com Broadcast

**Contexto:** com o monorepo estruturado e os models aplicados, a próxima demanda do Sprint 2 é a camada de tempo real — o mecanismo que sustenta o estado global único do `GERAL.md`, Seção 3. Os contratos dos seis eventos de broadcast e das duas mensagens de cliente já estavam tipados em `@aap/shared` desde o Sprint 0; falta a implementação sobre `@fastify/websocket`.

**Escopo aprovado:**

1. Infraestrutura de transporte: registro de conexões vivas, broadcaster e os seis emissores tipados de evento.
2. Controle de presença ativa de ponta a ponta: `OPERATOR_CLAIM`, `OPERATOR_CONNECTED` e `OPERATOR_DISCONNECTED`, com persistência de `isOnline` e `lastSeenAt`.
3. Reconciliação de presença órfã por expiração de heartbeat (item da Categoria 8, incorporado a esta task por decisão do solicitante).
4. Rota `GET /ws` e validação em tempo de execução das mensagens recebidas do cliente.

**Delimitação registrada:** os eventos `OFFER_CREATED`, `OFFER_STATE_CHANGED`, `OFFER_PUBLISHED` e `CHANNELS_UPDATED` nascem em módulos que ainda não existem (ingestão, rota de disparo, worker da fila e CRUD de canais). Esta task entrega os **emissores tipados prontos para serem chamados** por esses módulos, e não gatilhos simulados. Apenas os dois eventos de presença ficam funcionando de ponta a ponta, porque sua origem é o próprio socket.

**Decisões do solicitante nesta sessão:**

| Decisão | Escolha | Efeito no `CHECKLIST.md` |
| :--- | :--- | :--- |
| Reconciliação de presença órfã | Incluída nesta task | Encerra o item "Implementar reconciliação de presença órfã" (Categoria 8) |
| Retrato de presença ao conectar | Não implementar | A carga inicial da tela-portão permanece a cargo de `GET /api/operators/available`, preservando o catálogo de eventos do `ESPECS_TECNICAS.md` |

**Extensão de contrato aprovada:** o `ESPECS_TECNICAS.md`, Seção 3.2, descreve a resposta ao `OPERATOR_CLAIM` como "aceite ou `OPERATOR_IN_USE`", sem tipá-la. Serão acrescentadas ao contrato compartilhado as respostas ponto a ponto `OPERATOR_CLAIM_ACCEPTED` e `OPERATOR_CLAIM_REJECTED`, esta com motivo `OPERATOR_IN_USE` (constante preservada) ou `OPERATOR_UNAVAILABLE`. Também será acrescentado o schema Zod das mensagens de cliente, por serem entrada não confiável vinda do socket.

---

## 2026-09-09 — 03:38 — Interface com Tabler.io + Tailwind, sem animações

**Contexto:** o Sprint 0 deixou o encanamento visual pronto — Tabler e Tailwind ligados, preflight omitido para não sobrescrever o kit, e a regra global que zera `animation` e `transition` —, mas as duas telas seguiam como cascas, sem componentes e sem os estados de retorno que o requisito "apenas as reações corretas" exige. Havia também duplicação byte a byte de `useBackendHealth.ts` e `styles/index.css` entre os dois dashboards.

**Escopo aprovado:**

1. Criação do workspace `packages/ui` (`@aap/ui`) com os componentes, o CSS base e os hooks de interface compartilhados pelos dois dashboards.
2. Conjunto completo de componentes: `AppShell`, `PageHeader`, `Card`, `Modal`, `Button`, `Badge`, `DataTable`, `EmptyState`, `LoadingState`, `ErrorState`, `FormField` com seus campos, e `Alert`.
3. Migração do `useBackendHealth` e do CSS base para o pacote, eliminando a duplicação.
4. Aplicação do shell nos dois dashboards, com as três abas do dashboard remoto trocando por estado real.

**Decisões técnicas registradas:**

- **O JavaScript do Bootstrap/Tabler não será carregado.** Componentes interativos são implementados em React sobre as classes CSS do Tabler. Dois motivos: o JS do Bootstrap manipula o DOM por fora e conflita com o React; e ele coordena exibição por eventos `transitionend`, que a regra de "sem transições" torna imprevisíveis. O requisito deixa de ser apenas uma regra de CSS e passa a ser decisão de arquitetura de componente.
- **`:focus-visible` é preservado.** "Sem animações" não pode significar "sem retorno visual" — o indicador de foco é a reação correta que sustenta a operação por teclado.
- **Estado de carregamento sem spinner.** O spinner do Tabler depende de `animation`, que a regra global zera; um spinner congelado comunicaria a informação errada. O retorno de carregamento é dado por desabilitação do controle e mudança de rótulo.

**Decisões do solicitante nesta sessão:**

| Decisão | Escolha |
| :--- | :--- |
| Local dos componentes | Workspace compartilhado `packages/ui` |
| Escopo de componentes | Completo, incluindo `Modal`, `DataTable` e `FormField`, que os CRUDs da Categoria 4 vão consumir |

**Nota de validação:** o Firefox local não opera em modo headless enquanto a sessão do usuário está aberta. A conferência visual será tentada com um navegador headless instalado fora do repositório, preservando intocada a decisão em aberto entre Playwright e Puppeteer para o módulo de scraping.
