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
