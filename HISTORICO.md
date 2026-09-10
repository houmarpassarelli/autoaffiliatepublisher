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

---

## 2026-09-09 — 18:30 — Ações Resolutivas da Oferta: botões "Publicar" e "Descartar"

**Contexto:** o solicitante pediu os dois botões do card do Dashboard Remoto — "Publicar" (Thin Client: envia o payload de comando, não processa o envio) e "Descartar" (status `DISCARDED`, alimentando o histórico anti-recaptura) — pedindo explicitamente a análise das ligações entre eles antes da execução.

**Análise da ligação (base do desenho aprovado):** os dois botões não são funcionalidades independentes. São duas saídas do mesmo evento de domínio — a ação resolutiva de um operador sobre uma oferta em `OPEN`. Compartilham a porta de entrada (`status: OPEN`), a transição atômica do `ESPECS_TECNICAS.md`, Seção 6, a assinatura do operador (`operatorId` + `resolvedAt`) e o broadcast `OFFER_STATE_CHANGED`. Divergem apenas no estado de destino, na exigência de canais, na gravação do `DispatchLog` e no efeito a jusante. Consequência de arquitetura: **um serviço único de resolução de oferta com duas portas de entrada**, e não duas rotas com a trava de concorrência duplicada.

**Dependência absorvida:** o item "Bloqueio Atômico de Oferta (`findOneAndUpdate` condicional)" — Demanda 2.3, Categoria 6 — não é vizinho das duas tasks, é o miolo delas. Entra nesta execução.

**Escopo aprovado:**

1. **Backend** — módulo `apps/api/src/modules/offers/`: mapeador de DTO, calculadora do instante de disparo (fórmula da Seção 7), serviço de resolução com a transição atômica e as rotas `GET /api/offers`, `POST /api/offers/:id/dispatch` e `POST /api/offers/:id/discard`.
2. **Rotas de leitura de apoio**: `GET /api/channels` (canais ativos, para o seletor) e `GET /api/operators/available` (tela-portão, com nomes em uso marcados). Os CRUDs completos permanecem na Categoria 4.
3. **Frontend** — fatia vertical completa no `@aap/dashboard-remote`: tela-portão de operador consumindo o `OPERATOR_CLAIM` já pronto no servidor, cliente WebSocket com heartbeat, carga das três abas, card de oferta, seletor multicanal e os dois botões, reagindo ao broadcast.

**Decisões do solicitante nesta sessão:**

| Decisão | Escolha | Efeito |
| :--- | :--- | :--- |
| Limite da entrega no frontend | Fatia vertical completa até o clique real | Os dois itens ficam verificáveis de ponta a ponta; itens vizinhos da Categoria 5 são encerrados junto e marcados como tal |
| Fila BullMQ (Demanda 2.1) | Fora desta sessão | `scheduledFor` é calculado a partir da última oferta em `SCHEDULED` no banco, com o Δ de `DISPATCH_INTERVAL_MS`. O enfileiramento fica como ponto de extensão explícito e documentado |

**Delimitação honesta do escopo:** os drivers de canal (Categoria 6) não existem — nenhuma publicação real acontece nesta entrega. O que é entregue é o **comando, a trava de concorrência, a auditoria e a propagação de estado**. Uma oferta que chega a `COMPLETED` significa "ação resolutiva registrada", não "mensagem entregue no canal"; a confirmação de entrega é o `OFFER_PUBLISHED`, que nasce no worker da fila.

**Desvio deliberado da Seção 5 do `ESPECS_TECNICAS.md`:** a sequência documentada é broadcast (passo 3) antes da gravação do `DispatchLog` (passo 4). A implementação inverte os dois. O broadcast é uma escrita em memória que não falha de forma relevante; a gravação do log, sim. Inverter reduz a janela em que uma oferta fica resolvida sem auditoria — e a auditoria é o produto do disparo.

**Divergência estrutural registrada:** o `ARQUITETURA.md`, Seção 8, enumera seis módulos em `apps/api/src/modules`. Esta execução acrescenta `offers/` e `channels/`. A atualização daquele documento pertence ao Fluxo 2 (`INSTRUCAO_DOSSIE.md`) e não foi realizada nesta sessão de execução.

---

## 2026-09-09 — 21:06 — CRUDs do Dashboard Administrativo: Fontes de Coleta, Canais de Destino e Operadores

**Contexto:** o solicitante pediu os três CRUDs do painel administrativo — Fontes de Coleta (Demanda 1.2 e 3.1), Canais de Destino e Operadores (Demanda 1.2) —, pedindo explicitamente a análise das ligações entre eles antes da execução. Os três estão pendentes na Categoria 4 do `CHECKLIST.md` desde o Sprint 0, e duas das leituras correspondentes já existem com escopo estreito: `GET /api/channels` alimenta o seletor multicanal e `GET /api/operators/available` alimenta a tela-portão, ambas com DTO reduzido e sem os registros inativos. Fontes não têm nenhuma rota.

**Análise da ligação (base do desenho aprovado):** os três não são CRUDs paralelos, são as três portas de escrita do mesmo painel, ligadas por quatro eixos concretos.

1. **Credenciais dividem os três em dois grupos.** `sources.credentials` e `channels.credentials` são o mesmo problema duas vezes — valor que entra e nunca volta ao cliente. Operadores não têm credencial alguma. Como o cliente não recebe os valores, ele não pode reenviá-los inteiros numa edição: a escrita de credencial é **merge patch** (chave com `null` remove). É também o ponto único onde a criptografia em repouso entrará depois, sem alterar contrato.

2. **Os três são referenciados por coleções que não podem perder o vínculo — e isto decide o DELETE.** Fontes por `offers.sourceId`; canais por `offers.selectedChannels` e `dispatch_logs.channels` (chave desnormalizada); operadores por `offers.operatorId` e `dispatch_logs.operatorId` mais `operatorName` desnormalizado. Como `dispatch_logs` é insumo direto do comissionamento e a arquitetura a trata como auditoria imutável, vale **uma regra única para os três**: desativar é a operação normal, e excluir só é aceito quando não existe referência.

3. **Os três têm chave natural única e hoje a colisão devolve 500.** `sources.name`, `channels.key` e `operators.name` são índices únicos; o `E11000` do Mongo cai no tratador central como erro interno. Nome repetido é erro do usuário e precisa virar 409 nomeando o campo — um tradutor compartilhado, não três `try/catch`.

4. **Assimetria real no efeito sobre o dashboard remoto.** O canal fecha um ciclo que já estava pronto pelas duas pontas: `CHANNELS_UPDATED` existe tipado em `broadcastEvents.ts` e é consumido em `useChannels.ts` — faltava apenas o emissor, que é este CRUD. O operador não tem evento no catálogo do `ESPECS_TECNICAS.md`, Seção 3.1, e nenhum será inventado; o efeito que não pode esperar é outro — desativar ou excluir um operador **conectado** deixa a tela dele aberta e inútil, porque `requireActiveOperator` recusa toda ação. A fonte não tem efeito em tempo real.

**Consequência de arquitetura:** uma moldura de recurso compartilhada mais um hook de listagem e escrita, com três telas finas por cima — e não três telas escritas três vezes. É o consumo previsto para `Modal`, `DataTable` e `FormField`, cujo escopo completo foi aprovado na sessão do kit exatamente com esta justificativa.

**Escopo aprovado:**

1. **Contrato compartilhado** — schemas de criação e edição das três coleções, `adminChannelDtoSchema` com `credentialKeys` (o DTO consumido pelo dashboard remoto permanece intocado), `credentialsPatchSchema` e validador de `cronExpression`.
2. **Backend** — módulo `sources/` novo; escrita, credenciais e broadcast em `channels/`; escrita em `operators/`; utilitário de credenciais e tradutor de chave duplicada compartilhados; `revokeOperatorPresence()` na camada de tempo real.
3. **Kit `@aap/ui`** — promoção do cliente HTTP hoje isolado no dashboard remoto e hook de recurso administrativo.
4. **Dashboard Administrativo** — moldura de recurso, editor de credenciais e as três telas, com navegação por `Tabs`.

**Decisões do solicitante nesta sessão:**

| Decisão | Escolha | Efeito |
| :--- | :--- | :--- |
| Política de exclusão | Bloquear quando referenciado | `DELETE` responde 409 quando há oferta ou log apontando para o registro; a tela orienta a desativar. Preserva a auditoria do comissionamento |
| Cliente HTTP | Promover para o `@aap/ui` | `apiRequest`, `ApiError` e `describeError` saem do dashboard remoto e passam a ser compartilhados; evita a duplicação byte a byte que a sessão do kit eliminou |
| Operador desativado enquanto conectado | Encerrar o socket | Presença liberada e conexão fechada; o cliente já sabe voltar à tela-portão ao perder a identidade. Sem contrato novo |

**Por que o cliente HTTP vai para o `@aap/ui` e não para o `@aap/shared`:** é código de navegador. O `@aap/shared` compila sem `lib: DOM` e é consumido pelo backend — levar `fetch` para lá vazaria globais de navegador no pacote de contrato. O `@aap/ui` já faz HTTP no `useBackendHealth`.

**Delimitação de escopo:** a criptografia das credenciais em repouso permanece decisão em aberto (Categoria 8) — os valores são gravados como recebidos, como os models já documentam. Ficam de fora também `POST /api/sources/:id/run`, o Painel de Auditoria de Disparos e qualquer motor de ingestão.

---

## 2026-09-09 — 23:45 — Painel de Auditoria de Disparos

**Contexto:** o solicitante pediu o último item pendente do Dashboard Administrativo — a tabela de auditoria com filtros por data, operador, loja de origem e canal, e as colunas Data/Hora, Operador, Produto, Loja, Preço, Link e Status (`CHECKLIST.md`, Categoria 4). Os `dispatch_logs` já vêm sendo gravados a cada ação resolutiva desde 09/09/2026; o que faltava era a tela de consulta.

**Análise do item (base do desenho aprovado):**

1. **Este item é de leitura, não de gravação.** O `DispatchLogModel` já desnormaliza `offerTitle` e `sourceName`, com o comentário registrando o motivo — "evita join na listagem da auditoria". As sete colunas pedidas saem de um único documento, sem `populate` e sem consulta por linha. Uma decisão tomada duas sessões atrás paga aqui.

2. **Os quatro filtros não são o mesmo tipo de filtro.** Operador filtra por `operatorId` (identidade) e canal por chave estável — os dois têm cadastro vivo para alimentar a lista de opções, garantido pela regra de exclusão criada na sessão anterior. Data é intervalo sobre `dispatchedAt`. **Loja de origem é texto congelado:** o log guarda `sourceName`, não `sourceId`, porque a auditoria é imutável e o nome gravado é a verdade daquele instante. Consequência aceita e documentada: a lista de lojas do filtro vem dos valores distintos da própria coleção, e renomear uma fonte divide o filtro em duas entradas. Acrescentar `sourceId` ao model não consertaria os logs já gravados.

3. **A coluna "Status" precisa ser honesta sobre o que ainda não existe.** `deliveryStatus` nasce vazio, porque o worker de disparo é da Categoria 6 e não existe — uma coluna que dissesse "Publicado" mentiria. E há duas informações distintas que não podem ser fundidas: `actionType` é o que o **operador** fez (disparo automatizado ou cópia assistida, distinção que o `MONETIZACAO.md`, 3.3, registra como insumo do rateio), e `deliveryStatus` é o que a **máquina** entregou. As duas ocupam a mesma célula, sem inventar uma oitava coluna.

4. **Paginação não é opcional.** `dispatch_logs` é a única coleção do sistema que cresce para sempre e nunca é podada. As outras telas do painel carregam tudo porque fontes, canais e operadores são dezenas.

5. **O que não se reaproveita:** `useAdminResource` e `ResourceScreen` existem para cadastros com escrita. A auditoria é somente leitura, com filtros e paginação no servidor; forçá-la naquela moldura pioraria as duas. Reaproveitam-se `DataTable`, `Card`, `SelectField`, `TextField`, `Badge` e o cliente HTTP do `@aap/ui`.

**Escopo aprovado:**

1. **Contrato compartilhado** — schemas de consulta, de resposta paginada e das opções de filtro.
2. **Backend** — dois índices novos em `dispatch_logs` (`sourceName` e `channels`, ambos compostos com `dispatchedAt`) e o módulo `audit/` com `GET /api/logs`, `GET /api/logs/filters` e a exportação.
3. **Dashboard Administrativo** — quinta aba, barra de filtros, tabela com as sete colunas, totais e paginação.

**Decisões do solicitante nesta sessão:**

| Decisão | Escolha | Efeito |
| :--- | :--- | :--- |
| Exportação CSV | Incluir agora | O `MONETIZACAO.md`, 3.2, descreve o rateio como cruzamento entre os `dispatch_logs` e a planilha de vendas exportada da plataforma; sem exportação, esse cruzamento exigiria consulta direta ao MongoDB. A exportação respeita os filtros ativos |
| Totais do recorte | Contagem e soma dos preços | Responde "quanto o operador X movimentou no período" sem exportar nada. A contagem já é calculada pela paginação; a soma sai da mesma agregação. Registrado na tela que a soma é **preço de produto, não comissão** |

**Recorte do intervalo de datas:** `from` e `to` chegam como `YYYY-MM-DD` e são convertidos em início e fim do **dia local da máquina administrativa**, não em UTC. Interpretar em UTC jogaria um disparo das 22h de um dia brasileiro para o dia seguinte no filtro.

**Delimitação de escopo:** o cálculo de comissão permanece projeto futuro declarado no `MONETIZACAO.md`; o sub-ID por operador nos links segue como decisão em aberto na Categoria 8; e nada muda no que é gravado no momento do disparo.

**Atualização do plano durante a execução (Seção 3.4):** a tabela de auditoria precisa de preço e data e hora formatados, que já existiam em `apps/dashboard-remote/src/formatters.ts`. Copiá-los para o painel administrativo reintroduziria a duplicação byte a byte que motivou a promoção do cliente HTTP na sessão anterior. `formatCurrency`, `formatDateTime` e `formatDiscount` foram promovidos para `packages/ui/src/formatters.ts`, com os imports do dashboard remoto repontados — o mesmo critério, aplicado ao mesmo tipo de código: apresentação compartilhada pelas duas interfaces.

## 2026-09-10 — 01:25 — Ações de Interface: Botões "Copiar" e "Regenerar Copy"

**Contexto:** O solicitante comandou explicitamente "EXECUTE O DESENVOLVIMENTO" para duas funcionalidades no card do Dashboard Remoto: "Copiar para Área de Transferência" e "Regenerar Copy". A primeira reaproveita o núcleo resolutivo já implementado (com `COPIED_CLIPBOARD`), bastando apenas a interface. A segunda necessita de um mock no servidor, pois o LLM é da Demanda 1.4 (pendente).

**Escopo aprovado (Execução Direta):**

1. **Botão "Copiar para Área de Transferência":** Lê a copy (`messaging`), escreve no `navigator.clipboard` e chama `dispatchOffer` no servidor, com `DispatchActionType.COPIED_CLIPBOARD`.
2. **Botão "Regenerar Copy":** Localizado acima ou ao lado da copy exibida, com estado de loading enquanto aguarda o servidor.
3. **Backend (`apps/api`):** Criação da rota temporária `POST /api/offers/:id/regenerate`, simulando a chamada de LLM ao anexar texto de regeneração nas copys existentes, até que a Demanda 1.4 seja construída.

**Decisões:** O `regenerate` não emitirá evento no WebSocket por enquanto, já que não há `OFFER_UPDATED` especificado no contrato atual; a própria requisição HTTP devolve o novo `OfferDto` ao autor do comando para renderização imediata.

## 2026-09-10 — 01:40 — Serviço de Conversão de Link de Afiliado

**Contexto:** O solicitante enviou a instrução "EXECUTE O DESENVOLVIMENTO" para o Serviço de Conversão de Link de Afiliado, exigindo registro prévio do plano e, em seguida, a execução.

**Escopo aprovado (Execução Direta):**

1. **Criação do Serviço de Conversão:**
   - Será criado o arquivo `apps/api/src/modules/ingestion/affiliateLinkService.ts`.
   - Conterá a função `convertCanonicalToAffiliateUrl(canonicalUrl: string, affiliateTag: string): string`.
   - Utilizará a API padrão `URL` do Node.js para identificar o *hostname* e injetar a tag de forma contextual (ex.: `tag=` para Amazon, `aff_short_key=` para AliExpress, `aff_siteid=` para Shopee, `affiliate_id=` como genérico).
2. **Finalização:**
   - Adição da cobertura e relato no `DEVLOG.md`.
   - Marcação no `CHECKLIST.md` movendo o item de "Pendentes" para "Implementados no Código".

## 2026-09-10 — Fila BullMQ de Disparos com Delay Progressivo

**Contexto:** O usuário exigiu a execução da Demanda 2.1 (Fila de Disparos via BullMQ) com o comando direto "EXECUTE O DESENVOLVIMENTO", sem ideação.

**Escopo da Implementação (Execução Direta):**

1. **Configuração BullMQ:**
   - Criação do `dispatchQueue` (`apps/api/src/modules/queues/dispatchQueue.ts`) conectando ao Redis local usando as credenciais do `config.ts`.
   - Adaptação de `findDispatchHorizon` em `dispatchScheduler.ts` para ler os últimos jobs (`getDelayed`, `getWaiting`, `getActive`) da fila BullMQ para determinar o último `timestamp` reservado em vez de apenas ler o banco de dados.
2. **Integração no Serviço de Resolução:**
   - Em `offerResolutionService.ts`, após gravar a transição e a auditoria, a oferta será enfileirada (`dispatchQueue.add`) com o `delay` calculado.
3. **Worker de Disparo:**
   - Criação de `dispatchWorker.ts` processando a fila.
   - O Worker atualizará o status da oferta de `SCHEDULED` para `COMPLETED` quando o tempo chegar.
   - O Worker fará o broadcast `OFFER_PUBLISHED` via WebSocket para atualizar a UI.
4. **Atualização da Inicialização:**
   - Injetar o worker no ciclo de vida do Fastify (`server.ts` ou `main.ts`).
   - Finalização com registros no `DEVLOG.md` e atualização do `CHECKLIST.md`.

## 2026-09-10 — Demanda 1.3 (Parcial): Ingestor API, RSS e Scraper (Playwright/Cheerio)

**Contexto:** O solicitante exigiu a execução do desenvolvimento dos ingestores de coleta, os quais representam a entrada de ofertas no sistema (Demanda 1.3). 

**Escopo aprovado (Execução Direta):**

1. **Dependências:** Instalação de `axios`, `cheerio` e `playwright` no workspace `apps/api`.
2. **Contratos:** Definição da interface `IngestorDriver` em `contracts.ts`, que recebe a fonte e devolve os dados brutos como `RawOffer`.
3. **Drivers:**
   - **API:** Cliente genérico via Axios, configurado pelas credenciais cadastradas.
   - **RSS:** Leitor de feed XML que extrai os itens usando Axios e Cheerio.
   - **Scraper:** Motor híbrido que usa Playwright para páginas dinâmicas e Cheerio para estáticas.
4. **Fábrica:** `ingestorFactory.ts` que roteia a solicitação do worker para a instância adequada, baseado no `SourceType`.

## 2026-09-10 02:35 - Deduplicação por dedupeHash e SKU
- **Contexto:** Implementar a lógica de deduplicação na ingestão para garantir que ofertas já capturadas ou descartadas (`DISCARDED`) sejam ignoradas. A deduplicação utilizará o hash SHA-256 da URL canônica da oferta e a combinação de `externalSku` com `sourceId`.
