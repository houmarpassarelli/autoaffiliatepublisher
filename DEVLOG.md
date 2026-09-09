# Log de Execução de Desenvolvimento

Registro detalhado do que foi criado ou alterado em cada sessão de execução, conforme `INSTRUCAO_EXECUCAO.md`, Seção 7.

---

## 2026-09-08 — Sprint 0: Estruturação do Monorepo

Primeira sessão de código do projeto. Referência do plano aprovado: `HISTORICO.md`, entrada de 2026-09-08.

### 1. Base do monorepo

Adotado **npm workspaces** (`packages/*` e `apps/*`), com quatro pacotes: `@aap/shared`, `@aap/api`, `@aap/dashboard-admin` e `@aap/dashboard-remote`.

Arquivos de raiz criados: `package.json` (scripts orquestradores), `tsconfig.base.json` (modo `strict` mais `noUncheckedIndexedAccess`, `verbatimModuleSyntax` e `isolatedModules`, herdado por todos os pacotes), `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.editorconfig`, `.nvmrc`, `.gitignore`, `docker-compose.yml`, `.env.example` e `README.md`.

**TypeScript fixado em 5.9.** A versão 7 já é a estável no registro, mas o `typescript-eslint` declara suporte apenas até `<6.1.0`; manter o lint funcionando prevaleceu sobre usar a major mais recente. Reavaliar quando o `typescript-eslint` publicar suporte a TS 7.

### 2. `packages/shared` — contrato único

Criado para que nenhum tipo de domínio seja duplicado entre backend e dashboards:

- `enums/`: `SourceType`, `OfferStatus`, `ChannelMode`, `DispatchActionType` e `CopyFormat`.
- `schemas/`: DTOs em Zod de fonte, oferta, operador, canal e log de disparo, mais o contrato do healthcheck. Os DTOs trafegam com o `ObjectId` já serializado e **sem credenciais** — a fonte expõe apenas os nomes das chaves cadastradas, nunca os valores.
- `contracts/`: catálogo tipado dos 6 eventos de broadcast e das 2 mensagens de cliente do WebSocket, mais os payloads de comando de disparo e de descarte.

### 3. `apps/api` — backend

- `config/env.ts`: ambiente validado por Zod na inicialização, com falha imediata e mensagem por variável irregular. Inclui `DISPATCH_INTERVAL_MS`, o Δ do delay progressivo, exposto como parâmetro configurável e não como constante no código.
- `config/database.ts` e `config/redis.ts`: conexões únicas, com desligamento explícito e verificadores de estado usados pelo healthcheck. O cliente Redis já sobe com `maxRetriesPerRequest: null`, exigência do BullMQ.
- `database/models/`: os cinco models Mongoose, fiéis aos schemas do `ESPECS_TECNICAS.md`, Seção 2.
- `database/models/index.ts`: `ensureIndexes()`, que sincroniza os índices declarados no bootstrap.
- `server/app.ts`: Fastify com o type provider do Zod, CORS restrito às origens dos dashboards e tratamento central de erros que devolve 400 detalhado em falha de validação.
- `server/routes/healthRoutes.ts`: `GET /health`, reportando MongoDB e Redis separadamente e respondendo 503 quando qualquer um está fora.
- `main.ts`: bootstrap com ordem deliberada (infraestrutura antes do HTTP) e desligamento gracioso em `SIGINT`/`SIGTERM`.
- `modules/{ingestion,ai,dispatcher,queues,operators,websocket}/README.md`: escopo, regras não-negociáveis e decisões em aberto de cada módulo. Optou-se por documentar o escopo em vez de criar arquivos vazios de código.

### 4. Dashboards

Ambos em Vite 8 + React 19 + TypeScript, com Tabler.io como kit de componentes e Tailwind CSS 4 para utilitários.

- O Tailwind entra **sem o preflight** (importando apenas as camadas `theme` e `utilities`): o reset do Tailwind sobrescreveria os estilos base do Tabler, que é o kit oficial das interfaces.
- Regra global de CSS zerando `animation` e `transition`, atendendo ao requisito explícito de interfaces sem animações.
- Proxy de desenvolvimento de `/api`, `/health` e `/ws` para o backend, para que o código do cliente use sempre caminhos relativos.
- Cada dashboard traz sua casca: o administrativo lista os quatro módulos de CRUD previstos; o remoto já monta as três abas a partir do enum `OfferStatus`, provando o consumo do contrato compartilhado. Ambos verificam a saúde do backend validando a resposta com o mesmo schema que o servidor usa para serializá-la.

### 5. Infraestrutura local

`docker-compose.yml` com MongoDB e Redis, portas e volumes parametrizados por ambiente.

**MongoDB fixado na versão 7, temporariamente.** As imagens 8.x recusam a inicialização nesta máquina com a mensagem `Linux kernel versions 6.19 and newer has a known incompatibility` (SERVER-121912) — o kernel visto pelos containers é o 7.0.x da VM do Docker, ainda que o host reporte 6.17. A versão 7 sobe normalmente. Item de reavaliação registrado no `CHECKLIST.md`.

**Portas ajustadas ao ambiente da máquina:** o MongoDB local publica em 27018 (a 27017 já está ocupada por outro projeto) e os dashboards usam 5180 e 5181 (a 5173 também está ocupada). O `.env.example` mantém a porta padrão do MongoDB documentada, com nota sobre o conflito.

### 6. Validações executadas

| Verificação | Resultado |
| :--- | :--- |
| `npm run typecheck` nos 4 workspaces | Sem erros |
| `npm run lint` | Sem violações |
| `npm run build` completo | Backend compilado; os dois dashboards gerados pelo Vite |
| `docker compose up -d` | MongoDB e Redis `healthy` |
| `GET /health` com a stack de pé | `200 {"status":"ok","dependencies":{"mongodb":true,"redis":true}}` |
| Índices criados no MongoDB | Os 4 índices obrigatórios de `offers` conferidos no banco, incluindo o único em `dedupeHash` |
| Dashboards em modo dev | 200 em 5180 e 5181, com o proxy alcançando o `/health` do backend |

### 7. Pendências deixadas explicitamente em aberto

- Criptografia em repouso de `sources.credentials` e `channels.credentials`: os models já isolam o ponto onde ela será aplicada, sem alteração de contrato.
- Servidor WebSocket: apenas o contrato tipado foi criado. A implementação do broadcast é Sprint 2.
- Nenhum commit, branch ou push foi realizado, conforme a restrição do `INSTRUCAO_EXECUCAO.md`, Seção 1.

---

## 2026-09-09 — Demanda 2.2: Servidor WebSocket no Fastify com Broadcast

Referência do plano aprovado: `HISTORICO.md`, entrada de 09/09/2026.

### 1. Extensão do contrato compartilhado

`packages/shared/src/contracts/websocketContracts.ts`:

- **`clientMessageSchema`** (Zod, união discriminada por `type`). As mensagens do cliente eram apenas tipos TypeScript, o que não protege nada em tempo de execução: o que chega pelo socket é entrada não confiável e passa a ser validada antes de tocar o registro de presença.
- **Respostas ponto a ponto ao `OPERATOR_CLAIM`**: `OPERATOR_CLAIM_ACCEPTED` e `OPERATOR_CLAIM_REJECTED`, esta com motivo `OPERATOR_IN_USE` — a constante já existente, preservada — ou `OPERATOR_UNAVAILABLE`, para operador inexistente ou inativo. O `ESPECS_TECNICAS.md` descrevia essa resposta como "aceite ou `OPERATOR_IN_USE`" sem tipá-la.
- **`ServerOutboundMessage`**, união do que trafega do servidor ao cliente: evento de broadcast ou resposta direta.

### 2. Módulo `apps/api/src/modules/websocket`

| Arquivo | Conteúdo |
| :--- | :--- |
| `connectionRegistry.ts` | Registro em memória das conexões vivas e do vínculo socket ↔ operador. |
| `broadcaster.ts` | Envio a um socket ou a todos os abertos, descartando os que já morreram. |
| `broadcastEvents.ts` | Os seis emissores tipados de evento de estado. |
| `presenceService.ts` | Reivindicação, liberação, heartbeat e reset de presença. |
| `presenceReaper.ts` | Varredura periódica das conexões silenciosas. |
| `websocketRoutes.ts` | Rota `GET /ws` e ciclo de vida da conexão. |
| `index.ts` | Registro do módulo no Fastify e encerramento no desligamento. |

**Delimitação honesta do escopo:** quatro dos seis eventos (`OFFER_CREATED`, `OFFER_STATE_CHANGED`, `OFFER_PUBLISHED` e `CHANNELS_UPDATED`) nascem em módulos que ainda não existem — ingestão, rota de disparo, worker da fila e CRUD de canais. Foram entregues como **emissores tipados prontos para serem chamados**, e não como gatilhos simulados. Os dois eventos de presença funcionam de ponta a ponta, porque sua origem é o próprio socket.

### 3. Decisões de implementação

- **A disputa pelo nome do operador é resolvida em memória, não no banco.** A verificação seguida da escrita acontece no mesmo tick do event loop, o que a torna atômica por construção num backend monothread de processo único — a arquitetura homologada. Registrado no README do módulo que, se o backend passar a rodar em múltiplos processos, esta trava precisa migrar para o Redis.
- **`isOnline` em banco é projeção, não verdade.** A verdade é o socket vivo; o campo existe para que a tela-portão possa ser carregada por HTTP antes de qualquer conexão.
- **Mensagem inválida não derruba a conexão.** É descartada com log — um cliente desatualizado não deve tirar o operador do ar.
- **Ordem no varredor**: libera a presença antes de encerrar o socket, para que o broadcast de desconexão saia mesmo que o `terminate` falhe.
- **Contrato com o cliente**: o heartbeat deve começar assim que o socket abre, não apenas após a reivindicação. Conexões anônimas silenciosas também são varridas.

### 4. Duas salvaguardas contra presença travada

O `ESPECS_TECNICAS.md`, Seção 3.2, registra o risco de `isOnline: true` órfão. Ele tem duas causas distintas, e cada uma recebeu tratamento próprio:

- **Queda de rede sem `close` limpo** → varredor de heartbeat, com janela em `WEBSOCKET_HEARTBEAT_TIMEOUT_MS` (padrão 90s) e varredura a cada terço dela.
- **Morte abrupta do processo** → `resetPresence()` no bootstrap, antes que qualquer operador consiga se conectar. Sem isto, um `kill -9` deixaria nomes travados como "Em uso" para sempre, sem ninguém conectado para liberá-los.

### 5. Integração

- `config/env.ts` e `.env.example`: nova variável `WEBSOCKET_HEARTBEAT_TIMEOUT_MS`.
- `server/app.ts`: registro do plugin e da rota.
- `main.ts`: reset de presença no bootstrap e encerramento dos sockets com código 1001 (parada planejada) no desligamento gracioso, para que os clientes distingam isso de uma queda.
- Acrescentado `@types/ws` como dependência de desenvolvimento — os tipos do `@fastify/websocket` derivam dos tipos do `ws`.

### 6. Validações executadas

`typecheck`, `lint` e `build` limpos nos quatro workspaces. Com o backend de pé e dois clientes WebSocket simultâneos:

| Cenário | Resultado |
| :--- | :--- |
| Reivindicação de identidade | `OPERATOR_CLAIM_ACCEPTED` ao solicitante e `OPERATOR_CONNECTED` em broadcast aos dois |
| Segunda reivindicação do mesmo operador | `OPERATOR_CLAIM_REJECTED` com `OPERATOR_IN_USE` |
| Reivindicação de operador inexistente | `OPERATOR_CLAIM_REJECTED` com `OPERATOR_UNAVAILABLE` |
| JSON inválido, tipo desconhecido e `operatorId` malformado | Descartados; socket permaneceu aberto |
| Desconexão limpa | `OPERATOR_DISCONNECTED` em broadcast e `isOnline: false` conferido em banco |
| Conexão que para de enviar heartbeat | Encerrada pelo servidor dentro da janela, com a presença liberada |
| Presença órfã antes do bootstrap | `releasedPresences: 1` no log e `isOnline: false` em banco |

Os operadores criados para o teste foram removidos do banco e os scripts de verificação, descartados. Nenhum commit, branch ou push foi realizado.

---

## 2026-09-09 — Interface com Tabler.io + Tailwind, sem animações

Referência do plano aprovado: `HISTORICO.md`, entrada de 09/09/2026, 03:38.

### 1. Novo workspace `packages/ui` (`@aap/ui`)

Quarto workspace do monorepo, com os componentes, a folha de estilo base e os hooks de interface. Criado pelo mesmo raciocínio que justificou o `@aap/shared`: as duas telas são o mesmo produto e usam o mesmo kit. Sem ele, cada componente seria escrito duas vezes e o requisito de "sem animações" viraria duas regras passíveis de divergir.

| Grupo | Componentes |
| :--- | :--- |
| Layout | `AppShell`, `PageHeader` |
| Superfícies | `Card`, `Modal` |
| Ações | `Button`, `Badge` |
| Dados | `DataTable`, `LoadingState`, `EmptyState`, `ErrorState` |
| Formulário | `TextField`, `TextAreaField`, `SelectField`, `CheckboxField` |
| Navegação | `Tabs` |
| Feedback | `Alert` |
| Hooks | `useBackendHealth` |

### 2. Como o requisito passou a ser sustentado

Antes existia apenas a regra global de CSS. Agora são três camadas, e a principal é de arquitetura:

1. **O JavaScript do Bootstrap/Tabler não é carregado.** `Modal` e `Tabs` são React puro sobre as classes CSS do kit. Além do conflito entre a manipulação direta do DOM e a árvore controlada pelo React, o JS do Bootstrap coordena exibição por eventos `transitionend`, que se tornam imprevisíveis quando as transições estão zeradas.
2. **Nenhum componente recebe as classes de transição** `fade`, `show` (no diálogo) ou `collapsing`.
3. **Rede de segurança em CSS**, mantida para cobrir estilos de terceiros.

### 3. O que "apenas as reações corretas" exigiu na prática

- **Carregamento sem spinner.** O spinner do kit é uma `animation`, que a regra global congela — e um spinner parado comunica o oposto do que deveria. O `Button` responde com desabilitação e troca de rótulo (`loadingLabel`); o `LoadingState` responde com texto.
- **`:focus-visible` preservado e padronizado.** "Sem animações" não pode virar "sem retorno visual": o indicador de foco é o que torna a interface operável por teclado.
- **Erro nunca confundido com vazio.** O `DataTable` verifica erro antes de carregamento, e ambos antes da lista vazia — "não consegui carregar" e "não há registros" exigem ações diferentes do operador.
- **Acessibilidade tratada nos componentes, não em cada tela.** A moldura de campo gera e liga os identificadores de rótulo, dica e erro; o `Alert` escolhe entre `role="alert"` e `role="status"` conforme o tom; o `Modal` gerencia foco, `aria-modal` e trava de rolagem.

### 4. Eliminação da duplicação

`useBackendHealth.ts` e `styles/index.css` estavam copiados byte a byte nos dois dashboards. Ambos foram removidos dos apps e passaram para o pacote. O hook ganhou `refresh()`, que faltava: a tela sabia relatar a falha, mas não oferecia nova tentativa sem recarregar a página.

### 5. Aplicação nos dois dashboards

- **Administrativo**: shell, cartão de saúde da máquina administrativa com os três serviços em selos de estado, e os quatro módulos de CRUD previstos.
- **Remoto**: shell com indicador de conexão na barra superior e as três abas trocando por estado real, cada uma com o texto de ausência específico do seu momento do ciclo de vida.

### 6. Bug encontrado e corrigido na conferência visual

A primeira versão do `Modal` substituía o wrapper `.modal` do Bootstrap por um contêiner próprio com backdrop customizado. O diálogo renderizou **sem superfície**: título, corpo e rodapé flutuando sobre a página. Causa: o `.modal-content` herda fundo, borda e raio de variáveis CSS declaradas no escopo de `.modal`; sem esse wrapper, elas ficam indefinidas e o fundo cai para transparente.

Correção: a marcação passou a preservar a estrutura do kit — `.modal-backdrop` mais `.modal` > `.modal-dialog` > `.modal-content` —, mantendo a ausência da classe `fade` e o controle inteiramente em React. O CSS do backdrop próprio foi removido. O motivo está documentado no comentário do componente, para que a estrutura não seja "simplificada" de novo no futuro.

Este bug só apareceu porque a conferência foi visual: `typecheck`, `lint` e `build` passavam com o modal invisível.

### 7. Validações executadas

`typecheck`, `lint` e `build` limpos nos cinco workspaces. Conferência visual com Chromium headless, instalado fora do repositório para não antecipar a decisão em aberto entre Playwright e Puppeteer no módulo de scraping:

| Verificação | Resultado |
| :--- | :--- |
| Dashboard administrativo renderizado | Shell, alerta, cartão de saúde com MongoDB e Redis conectados, e os quatro módulos |
| Dashboard remoto renderizado | Shell, selo de conexão e as três abas com o estado vazio correspondente |
| **Auditoria de movimento em tempo de execução** | **Zero elementos com `transition-duration` ou `animation-duration` acima de zero** |
| Abas | Clique em "Agendadas" troca a aba ativa e o conteúdo do painel |
| Modal | `aria-modal`, rótulo ligado ao título, foco dentro do diálogo, rolagem da página travada e remoção do DOM ao pressionar Esc |
| Kit completo | `DataTable`, campos de formulário com erro de validação, botões nos quatro estados, e os três estados de retorno conferidos em imagem |

A conferência do kit usou uma página de prévia temporária dentro do dashboard administrativo, **removida ao final** — confirmado que restaram apenas `App.tsx` e `main.tsx` no diretório. Nenhum commit, branch ou push foi realizado.

---

## 2026-09-09 — Ações Resolutivas da Oferta: botões "Publicar" e "Descartar"

Referência do plano aprovado: `HISTORICO.md`, entrada de 09/09/2026, 18:30.

### 1. A ligação entre os dois itens, e o que ela determinou no código

Os dois botões não são funcionalidades independentes: são duas saídas do mesmo evento de domínio — a ação resolutiva de um operador sobre uma oferta em `OPEN`. Compartilham a porta de entrada, a transição atômica, a assinatura do operador e o broadcast. Divergem no estado de destino, na exigência de canais, na gravação do `DispatchLog` e no efeito a jusante.

Isso decidiu o desenho: **um serviço de resolução com duas portas de entrada** (`offerResolutionService.ts`), e não duas rotas com a trava de concorrência duplicada. O trecho onde duplicar sairia mais caro é exatamente o `findOneAndUpdate` condicional.

A dependência que os dois arrastam — "Bloqueio Atômico de Oferta", Demanda 2.3 — não é vizinha das tasks, é o miolo delas, e foi implementada aqui.

### 2. Backend

| Arquivo | Conteúdo |
| :--- | :--- |
| `server/errors.ts` | `BadRequestError`, `NotFoundError` e `ConflictError` sobre `statusCode`, aproveitando o tratador central já existente |
| `modules/offers/offerMapper.ts` | Documento → `OfferDto`, com normalização do `aiCopy` (Map ou objeto) e o menor preço já registrado |
| `modules/offers/offerQueryService.ts` | Carga das abas, resolvendo lojas e operadores em bloco — uma consulta por lote, não por card |
| `modules/offers/dispatchScheduler.ts` | Fórmula do instante de disparo e leitura do horizonte da fila |
| `modules/offers/offerResolutionService.ts` | Transição atômica, auditoria e broadcast — o núcleo das duas ações |
| `modules/offers/offerRoutes.ts` | `GET /api/offers`, `POST /api/offers/:id/dispatch`, `POST /api/offers/:id/discard` |
| `modules/channels/` | `GET /api/channels` e o mapeador de DTO, para o seletor multicanal |
| `modules/operators/operatorRoutes.ts` | `GET /api/operators/available`, com "Em uso" lido do registro de conexões vivas |

Índice acrescentado em `offers`: `{ scheduledFor: -1 }`, que sustenta a consulta do horizonte da fila.

**Ordem das operações, com um desvio deliberado.** O `ESPECS_TECNICAS.md`, Seção 5, lista broadcast (passo 3) antes da gravação do `DispatchLog` (passo 4). A implementação inverte: o broadcast é escrita em memória e não falha de forma relevante; a gravação do log, sim. Inverter encolhe a janela em que uma oferta fica resolvida sem auditoria — e a auditoria é o produto do disparo.

**Validação antes da transição.** Operador inativo e canal inexistente recusam o comando *sem* consumir a oferta. Um comando malformado não pode tirar a oferta da fila de todos os outros operadores.

**O descarte não grava `DispatchLog`.** Nada foi publicado, e `dispatch_logs` é insumo direto do comissionamento futuro; registrar descarte ali contaminaria o rateio.

### 3. Frontend — fatia vertical completa no Dashboard Remoto

| Diretório | Conteúdo |
| :--- | :--- |
| `api/` | Cliente HTTP com resposta validada pelo schema compartilhado e `ApiError` preservando o código — o 409 precisa ser distinguido de falha de rede |
| `realtime/` | `RealtimeClient` (heartbeat desde a abertura, reconexão e nova reivindicação) e os hooks de inscrição |
| `state/` | Quadro das três abas, canais ativos e ressincronização na volta da conexão |
| `components/` | `OperatorGate`, `ChannelSelector`, `OfferCard` e `OfferBoard` |

O `App.tsx` deixou de ser casca: abre o socket antes da tela-portão (a própria seleção precisa reagir a quem entra e sai), leva à curadoria após o aceite e devolve à seleção se a identidade for perdida numa reconexão.

**O seletor guarda o que foi desmarcado, não o que está marcado.** Assim "todas as caixas vêm pré-marcadas" continua valendo quando a lista de canais muda embaixo do card: um canal criado no painel administrativo chega já marcado, sem apagar as exclusões que o operador já tinha feito.

### 4. Três defeitos encontrados na execução, todos corrigidos

**a) O contrato de datas quebrava toda rota que devolvesse data.** `isoDateSchema` era uma união com `.transform()`. O Fastify serializa a resposta pelo mesmo schema, no sentido inverso, e `transform` é unidirecional: a primeira chamada a `GET /api/offers` respondeu 500 com `ZodEncodeError`. O schema passou a ser `z.iso.datetime({ offset: true })` e a conversão foi para os mapeadores, onde o compilador cobra que ela aconteça. Nenhum tipo mudou — a saída do `transform` já era `string`.

Este defeito estava latente desde o Sprint 0 e só não apareceu antes porque nenhuma rota existente devolvia data.

**b) A política anti-spam não segurava dois cliques seguidos.** A verificação reproduziu: segunda oferta disparada 214 ms depois da primeira. A causa é uma divergência entre documentos. O trecho de código do `ESPECS_TECNICAS.md`, Seção 7, devolve "agora" sempre que o último agendamento já passou — o que só preserva o anti-spam enquanto o disparo imediato ainda estiver pendente numa fila. No instante em que ele é processado, a rajada volta.

Prevaleceu a regra do `ARQUITETURA.md`, Seção 7 ("item 1 imediato, item 2 em +Δ, item 3 em +2Δ") e do `FLUXO_OPERACIONAL.md`, Seção 9.1: **nenhum disparo acontece a menos de Δ do anterior**. O horizonte "vencido" passou a significar "a janela de Δ já se esgotou", e não "o instante apenas passou". Divergência documentada no comentário da função, no README do módulo e aqui.

Decorre daí que **a oferta de disparo imediato também grava `scheduledFor`**: sem registrar o instante reservado, dois cliques com a fila vazia produziriam dois disparos instantâneos.

**c) O quadro ficava defasado após uma queda de conexão.** Enquanto o socket está fora, o broadcast não chega — ofertas novas e decisões de outros operadores acontecem sem que a tela saiba, e o estado global deixa de ser único. Acrescentado `useResyncOnReconnect`: a volta de uma queda recarrega fila e canais. A primeira conexão não dispara recarga, porque a carga inicial já aconteceu por HTTP.

### 5. Dois ajustes vindos da conferência visual

- **Imagem que não carrega virava ícone quebrado** bem no ponto onde o operador olha primeiro. Passou a exibir espaço reservado com a altura preservada, para que a lista não mude de altura entre cards.
- **A aba Agendadas exibia a chave interna do canal** (`verify-telegram`) em vez do rótulo. A chave é identificador de payload e de auditoria, não o nome pelo qual o operador conhece o destino. Canal removido do cadastro depois do disparo cai de volta na chave — é o único nome que resta dele.

### 6. Validações executadas

`typecheck`, `lint` e `build` limpos nos cinco workspaces. Backend de pé sobre MongoDB e Redis, com dados semeados e removidos ao final.

**Backend, 29 verificações:**

| Cenário | Resultado |
| :--- | :--- |
| Carga das abas, ordenação decrescente e DTO sem `originalUrl` nem `dedupeHash` | Conferido |
| Publicar com a fila vazia | `OPEN -> COMPLETED`, disparo imediato |
| Publicar com a fila ocupada | `OPEN -> SCHEDULED`, Δ de exatamente 180.000 ms |
| Terceiro e quarto cliques | Escalonados em 22:48 → 22:51 → 22:54 → 22:57 |
| Duas requisições simultâneas na mesma oferta | Uma 200, outra 409 com mensagem explicativa |
| Canal inexistente | 400, e a oferta **permanece** em `OPEN` |
| Descartar | `DISCARDED`, sem `scheduledFor`, sem canais, com assinatura |
| Descartar oferta já resolvida | 409 |
| Auditoria | 4 logs para 4 publicações, **nenhum** para o descarte; preço, SKU e assinatura congelados; `deliveryStatus` vazio |
| `COPIED_CLIPBOARD` | Registrado com o mesmo peso, mudando só o `actionType` |
| `OFFER_STATE_CHANGED` | Recebido por outro operador conectado, nas duas ações |

**Interface, 22 verificações** (Chromium headless dirigido por CDP com WebSocket puro — sem trazer Playwright nem Puppeteer para o repositório, preservando aquela decisão em aberto):

| Cenário | Resultado |
| :--- | :--- |
| Tela-portão, entrada e chegada ao quadro | Conferido em imagem |
| Card com miniatura, título, preços, desconto, loja e copy da IA | Conferido em imagem |
| Seletor multicanal todo pré-marcado, com a opção mestre | Conferido |
| "Desmarcar Todos" desabilita "Publicar" com explicação visível | Conferido |
| Clique em "Publicar" e em "Descartar" retira o card e atualiza os contadores | Conferido |
| Aba Agendadas com envio previsto, operador e canais pelo rótulo | Conferido em imagem |
| Oferta já resolvida não exibe botões de ação | Conferido |
| **Auditoria de movimento** | **Zero elementos com transição ou animação acima de zero** |
| Acessibilidade e console | Toda caixa com rótulo associado, imagens com `alt`, nenhum erro |

**Concorrência entre dois operadores, 9 verificações** (dois navegadores independentes):

| Cenário | Resultado |
| :--- | :--- |
| Nome em uso aparece desabilitado com a marcação "Em uso" | Conferido |
| Os dois veem exatamente a mesma fila global | Conferido |
| Publicação de um remove o card da tela do outro, sem F5 | Conferido |
| Descarte de um remove o card da tela do outro | Conferido |
| Clique simultâneo no mesmo card | Some das duas telas, listas idênticas ao final |
| "Sair" libera o próprio nome e mantém o do outro em uso | Conferido |

**Reconexão, 8 verificações:** queda do backend sinalizada na barra superior; conexão restabelecida sozinha; identidade reivindicada de novo e confirmada no servidor; fila ressincronizada, perdendo o que mudou enquanto o socket esteve fora.

Os dados de verificação foram removidos do banco (as cinco coleções voltaram a zero documentos) e os scripts, descartados. Nenhum commit, branch ou push foi realizado.

### 7. Pendências deixadas explicitamente em aberto

- **Nenhuma publicação real acontece.** Os drivers (Categoria 6) não existem. `COMPLETED` significa "ação resolutiva registrada", não "mensagem entregue no canal".
- **A fila BullMQ não entrou** (Demanda 2.1, decisão do solicitante). O horizonte é lido da coleção de ofertas, e `dispatchScheduler.ts` isola os dois pontos que a fila vai assumir. Enquanto ela não existe, nada move uma oferta de `SCHEDULED` para `COMPLETED`.
- **O descarte é irreversível e não pede confirmação.** `DISCARDED` bloqueia o produto permanentemente na deduplicação da ingestão, e um clique errado não tem desfazer. A ausência de confirmação seguiu o requisito de agilidade ("5 a 10 segundos", `FLUXO_OPERACIONAL.md`, Seção 1); se o risco pesar mais que a agilidade, é decisão do solicitante e vira item próprio.
- **Botão "Copiar para Área de Transferência"**: a rota já aceita `COPIED_CLIPBOARD` e o caminho está verificado ponta a ponta. O item permanece pendente como task exclusivamente de interface.
