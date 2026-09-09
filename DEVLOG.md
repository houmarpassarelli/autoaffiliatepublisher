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
