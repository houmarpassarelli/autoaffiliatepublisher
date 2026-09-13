# Histórico de Planos de Execução

Registro dos planos aprovados pelo solicitante antes de cada sessão de execução de código, conforme `INSTRUCAO_EXECUCAO.md`, Seção 3.

---

## 2026-09-13 — 05:44 — Implementação do Filtro Determinístico Pré-IA

**Contexto:** O projeto necessita de uma etapa de descarte de ofertas irrelevantes (desconto irrisório, preço fora da faixa, categoria indesejada) antes da chamada ao LLM, economizando tokens e otimizando o fluxo.

**Escopo aprovado:**
1. Atualização dos Schemas Zod em `packages/shared/src/schemas/sourceSchemas.ts` com os campos `preFilterMinDiscount`, `preFilterMinPrice`, `preFilterMaxPrice`, `preFilterAllowedCategories`, e `preFilterBlockedCategories`.
2. Atualização do Mongoose Model em `apps/api/src/database/models/sourceModel.ts` com os novos campos.
3. Atualização da interface `RawOffer` em `apps/api/src/modules/ingestion/contracts.ts` para incluir `category`.
4. Criação da função `evaluateDeterministicFilter` em `apps/api/src/modules/ingestion/offerUtils.ts`.


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
- **Contexto:** Implementar a lógica de deduplicação na ingestão para garantir que ofertas já capturadas ou descartadas (`DISCARDED`) sejam ignoradas. A deduplicação utilizará o hash SHA-256 da URL canônica da oferta e a combination de `externalSku` com `sourceId`.

## 2026-09-10 02:44 - Geração das 3 Variantes de Copy (Módulo IA)
- **Contexto:** Implementar a integração com LLM para gerar as 3 variantes de copy (messaging, social, article) usando o OpenAI (gpt-4o-mini) garantindo retorno determinístico via JSON mode (Structured Outputs). Inclui também a criação da rota temporária/sob-demanda `/api/offers/:id/regenerate-copy` e integração no frontend.

## 2026-09-10 03:20 - Reverificação de Preço e Disponibilidade Pré-Disparo
- **Contexto:** Reverificação da oferta na origem logo antes de disparar pelo `dispatchWorker.ts`.
- **Decisão (Política de Divergência):** Abortar o disparo, preencher `deliveryStatus` de cada canal selecionado com "ABORTED_DUE_TO_DIVERGENCE" no `DispatchLog`, limpar o agendamento (`operatorId`, `scheduledFor`, `selectedChannels`) da oferta e devolvê-la ao status `OPEN` atualizando o preço. Emitir evento `OFFER_STATE_CHANGED`.
- **Implementação:** Extensão da `IngestorDriver` com o método `reverifyOffer`, e adição da validação no início do job de envio (`dispatchWorker.ts`).

## 2026-09-11 — 13:30 — Validação e Formalização do Broadcast OFFER_PUBLISHED

**Contexto:** O solicitante comandou explicitamente a execução do desenvolvimento da feature "Broadcast OFFER_PUBLISHED na Conclusão do Job".

**Escopo aprovado e executado:**

1. **Auditoria de Código:** Foi confirmado que a funcionalidade já se encontrava plenamente implementada nos módulos `dispatchWorker.ts`, `broadcastEvents.ts` e `useOfferBoard.ts`, em virtude da execução da Fila BullMQ (Demanda 2.1) no dia 10/09/2026.
2. **Organização:** Movido o respectivo item no `CHECKLIST.md` de "Pendentes" para "Implementados no Código", corrigindo o desvio documental constatado.

## 2026-09-11 — 14:40 — Definição da Estratégia de WhatsApp

**Contexto:** O solicitante comandou explicitamente "EXECUTE O DESENVOLVIMENTO: Definir a estratégia de WhatsApp (*modo exclusivamente assistido, ou adoção de biblioteca não-oficial com o risco de banimento aceito*)".

**Decisões do solicitante nesta sessão:**
Foi decidido adotar uma biblioteca não-oficial (automação total com risco de banimento aceito) para a postagem em Canais do WhatsApp.

**Escopo aprovado e executado:**
Atualização da documentação (`CHECKLIST.md`, `TOOLS.md` e `FLUXO_OPERACIONAL.md`) para formalizar a escolha pela automação total via biblioteca não-oficial, com o risco de banimento plenamente aceito, rebaixando o modo assistido para fallback. O item foi movido para a lista de tarefas concluídas.

## 2026-09-12 — 00:39 — Contagem Regressiva na Aba Agendadas

**Contexto:** O solicitante comandou explicitamente "EXECUTE O DESENVOLVIMENTO: Contagem Regressiva na Aba Agendadas". A auditoria do código confirmou que o horário previsto de envio, os canais selecionados e a assinatura do operador já eram exibidos pelo `ResolvedSummary` do `OfferCard.tsx`; faltava apenas o countdown vivo por item, exigido pelo `FLUXO_OPERACIONAL.md`, Seção 3.2.

**Escopo aprovado:**

1. **`packages/ui/src/hooks/useCountdown.ts` (novo):** hook genérico do kit com relógio único de 1 Hz no escopo do módulo — um `setInterval` compartilhado por todos os assinantes, em vez de um timer por card, para que dezenas de cards agendados não criem dezenas de timers derivando entre si. O tempo restante é recalculado a partir de `Date.now()` a cada tique, nunca decrementado, o que o torna imune ao *throttling* de aba em segundo plano.
2. **`packages/ui/src/formatters.ts` (edição):** `formatCountdown(remainingMs)`, ao lado dos demais formatadores, com saída em pt-BR e supressão da unidade maior quando zerada (`1 h 04 min 09 s`, `04 min 09 s`, `09 s`), clampada em zero.
3. **`packages/ui/src/index.ts` (edição):** exportação do novo hook.
4. **`apps/dashboard-remote/src/components/OfferCountdown.tsx` (novo):** camada de domínio da apresentação — `Badge` com tom por urgência e, no vencimento, o rótulo "Disparo iminente", nunca "Disparado": o card só deixa a aba quando o servidor emite `OFFER_PUBLISHED`.
5. **`apps/dashboard-remote/src/components/OfferCard.tsx` (edição):** countdown ao lado do horário absoluto na linha "Envio previsto", exclusivo do estado `SCHEDULED`.

**Limitação declarada:** o countdown roda sobre o relógio do cliente; um aparelho com hora desregulada exibe contagem desregulada. O horário absoluto ao lado permanece correto, por vir do servidor. A correção do desvio exigiria sondar o horário do backend e fica registrada como ponto de extensão.
## 2026-09-12 — 00:49 — Cálculo de Desconto Percentual e Registro de Histórico de Preços

**Contexto:** O solicitante comandou explicitamente "EXECUTE O DESENVOLVIMENTO: Cálculo de Desconto Percentual e Registro de Histórico de Preços". A tarefa envolve o enriquecimento da série temporal `priceHistory` toda vez que um mesmo item for recapturado na ingestão, e o cálculo de desconto para inserção nas novas ofertas.

**Escopo aprovado (Execução Direta):**

1. **Utilitário de Ingestão (`apps/api/src/modules/ingestion/offerUtils.ts`):**
   - Criação da função `calculateDiscountPct` limitando entre 0 e 100.
   - Criação da função `enrichRawOffer` que, dada uma `RawOffer`, devolve o objeto formatado (incluindo o desconto e o primeiro histórico) para ser futuramente persistido pelo motor de inserção (que é outra demanda).

2. **Deduplicação e Histórico (`apps/api/src/modules/ingestion/deduplicationService.ts`):**
   - A função `filterNewOffers`, que antes apenas jogava foras os dados repetidos, agora fará uma correlação.
   - A função acionará um `OfferModel.bulkWrite` efetuando o `$push` no campo `priceHistory` de cada oferta repetida no banco, usando o `priceCurrent` da captura atual e `capturedAt: new Date()`.
   - O array `priceHistory` passa a refletir oscilações de preço independentemente do status atual da oferta na curadoria.

## 2026-09-12 — 00:56 — Adição da verificação de compliance obrigatória no cadastro de fontes

**Contexto:** O projeto exige que o operador confirme a verificação das regras de compliance de cada programa de afiliados (ex: restrições da Amazon para mensagens privadas) no momento da criação/edição de uma fonte, garantindo conformidade.

**Escopo aprovado (Execução Direta):**

1. **Contratos e Schemas (`packages/shared/src/schemas/sourceSchemas.ts`)**:
   - Adição do campo `complianceVerified: z.boolean()` no `sourceDtoSchema` e no `sourceWritableFieldsSchema`, com validação explícita (`.refine()`) obrigando que o valor seja `true` em qualquer submissão.
2. **Banco de Dados / Model (`apps/api/src/database/models/sourceModel.ts`)**:
   - Adição da propriedade `complianceVerified: boolean` na interface `SourceAttributes` e no schema do Mongoose (`required: true, default: false`).
   - Mapeamento e propagação no `sourceMapper.ts` e `sourceService.ts`.
3. **Interface / Dashboard Administrativo (`apps/dashboard-admin/src/screens/SourcesScreen.tsx`)**:
   - Adição ao `SourceDraft`, `EMPTY_DRAFT` e ao payload de submissão.
   - Inclusão do componente `<CheckboxField>` no final do formulário, com hint orientativo explícito das regras do programa.

## 2026-09-12 — 01:05 — Formalização do Playwright como Biblioteca de Ingestão Dinâmica

**Contexto:** O projeto tinha como pendência (Categoria 8 do `CHECKLIST.md`) a escolha entre Playwright e Puppeteer para web scraping, sendo regra do repositório manter apenas uma das duas dependências. Constatou-se que o Playwright já estava instalado (`v1.63.0`) no `apps/api/package.json` e importado/configurado no arquivo de ingestão base (`scraperIngestor.ts`), enquanto o Puppeteer não existia no código.

**Escopo aprovado (Execução Direta):**

1. **`CHECKLIST.md`**:
   - Mover a task de escolha para a seção "Concluídas".
2. **`TOOLS.md` e `ARQUITETURA.md`**:
   - Remover as linhas e menções referentes ao Puppeteer.
   - Apagar a menção de "decisão em aberto".
3. **`DOSSIE.md`**:
   - Atualizar a lista de "Decisões em aberto" removendo essa pendência e ajustando referências anteriores.
4. **`apps/api/src/modules/ingestion/README.md`**:
   - Atualizar a declaração do módulo para oficializar a exclusividade do Playwright.

## 2026-09-12 — 01:17 — Criptografia das Credenciais em Banco

**Contexto:** As credenciais das fontes e canais de destino são atualmente armazenadas em texto claro no banco de dados. Como `apps/api/src/database/credentials.ts` concentra o fluxo de modificação (patch) e leitura das chaves, ele é o local ideal para centralizar a camada de criptografia. Os *models* e *DTOs* permanecerão inalterados, e o Dashboard continuará recebendo apenas a lista das chaves disponíveis.

**Escopo aprovado (Execução Direta):**

1. **Configuração de Ambiente (`apps/api/src/config/env.ts`):** Adicionar a variável obrigatória `CREDENTIALS_SECRET` via Zod.
2. **Criptografia (`apps/api/src/database/credentials.ts`):** Adicionar funções internas auxiliares `encryptValue()` e `decryptValue()` com AES-256-GCM. A chave de encriptação será derivada do `CREDENTIALS_SECRET` com SHA-256. Atualizar `applyCredentialsPatch` para encriptar e adicionar a função `getDecryptedCredentials()`.
3. **Injeção nas Integrações Externas (`apps/api/src/modules/ingestion/drivers/apiIngestor.ts`):** Extrair headers originais pela nova função `getDecryptedCredentials()`.
4. **Variáveis Locais:** Inserir mock de `CREDENTIALS_SECRET` e `OPENAI_API_KEY` nos arquivos `.env` e `.env.example`.
5. **Atualizações de Histórico e Documentação:** Concluir registros.

## 2026-09-12 — 02:34 — Definição da Estratégia de Exposição Segura do Dashboard Remoto

**Contexto:** O sistema roda localmente e não possui autenticação própria. O solicitante demandou a definição e documentação da estratégia de exposição segura do Dashboard Remoto para acesso externo ("VPN, túnel reverso ou proxy com autenticação").

**Estratégia Escolhida (Opção A):**
Túnel reverso com Proxy Autenticado via **Cloudflare Tunnels (Zero Trust)**.

**Escopo aprovado (Execução Direta):**
1. Atualização das documentações (`TOOLS.md` e `CHECKLIST.md`) formalizando a adoção do Cloudflare Tunnels (Zero Trust) como a solução padrão de exposição.
2. Criação do documento `INFRA_EXPOSICAO.md` contendo o passo a passo de configuração.
3. Inclusão do container `cloudflared` no `docker-compose.yml` para infraestrutura automatizada.
4. Registro em `DEVLOG.md` detalhando as modificações e a conclusão da demanda.

## 2026-09-13 — 05:22 — Confirmação no Descarte de Ofertas

**Contexto:** O descarte de ofertas (status `DISCARDED`) é terminal e definitivo, impedindo recaptura. Para evitar cliques acidentais e perda irreversível, implementaremos uma etapa de confirmação antes de disparar o comando de descarte, conforme decisão do usuário.

**Escopo aprovado:**
1. Modificação do componente `OfferCard` (`apps/dashboard-remote/src/components/OfferCard.tsx`) para incluir um estado `showDiscardConfirm`.
2. Interceptar o clique do botão "Descartar" original para ativar o estado de confirmação, exibindo um componente de confirmação.
3. Adição de botões de confirmação segura ("Confirmar Descarte" e "Cancelar").
4. Atualização dos documentos `FLUXO_OPERACIONAL.md` e `CHECKLIST.md` formalizando a decisão.

## 2026-09-13 — 05:32 — Definição do valor operacional do intervalo do delay progressivo (DISPATCH_INTERVAL_MS)

**Contexto:** O projeto necessitava definir o valor operacional do intervalo de disparo para evitar penalizações de spam e manter o engajamento da audiência. O intervalo sugerido era entre 30 e 60 minutos, frente à referência inicial insuficiente de 3 minutos.

**Escopo aprovado (Execução Direta):**
1. Definição do valor operacional de **45 minutos** (`2.700.000` ms) como `DISPATCH_INTERVAL_MS`.
2. Alteração do valor padrão na validação `apps/api/src/config/env.ts` de `180_000` para `2_700_000`.
3. Atualização dos arquivos `.env` e `.env.example` com o novo valor e remoção do comentário de "decisão em aberto".
4. Atualização da documentação (`ESPECS_TECNICAS.md`, `ARQUITETURA.md`, `DOSSIE.md`, e demais localizações) consolidando a decisão em substituição à referência inicial de 3 minutos.
5. Fechamento da task no `CHECKLIST.md` e inclusão da sessão no `DEVLOG.md`.
    
## 2026-09-13 — 05:52 — Engine de Ingestão com Scheduler por Fonte

**Contexto:** Implementação do agendador automático que fará a ingestão de ofertas de acordo com o intervalo definido (`cronExpression`) de cada fonte ativa, além da disponibilização de um endpoint manual para disparo de varredura. Esta é a Demanda 1.3 da Sprint 1.

**Escopo aprovado:**
1. Adicionar `node-cron` e `@types/node-cron` no workspace `apps/api`.
2. Criar `schedulerService.ts` com gerenciamento em memória dos jobs e reatividade para adição/remoção.
3. Criar `ingestionRunner.ts` orquestrando o pipeline: coleta, deduplicação (que já grava `priceHistory`), filtro determinístico (marcando como `DISCARDED` se falhar), enriquecimento com IA (`aiService`) para gerar a copy final e persistência como `OPEN`. Emissão do websocket `OFFER_CREATED`.
4. Acoplar a inicialização e o encerramento do agendador ao `main.ts`.
5. Modificar rotas do CRUD de fontes para reagir a alterações e expor a rota manual `POST /api/sources/:id/run`.
\n## 2026-09-13 — 06:36 — Driver WhatsApp Canais\n\n**Contexto:** O projeto usará uma biblioteca não-oficial para postar em canais/grupos no WhatsApp, conforme definido em `TOOLS.md`. A escolha mais leve e performática para um backend Node.js é o `@whiskeysockets/baileys`, que interage nativamente via WebSocket.\n\n**Escopo aprovado:**\n1. Instalação das dependências `@whiskeysockets/baileys` e `qrcode-terminal` no `@aap/api`.\n2. Criação do serviço do cliente (`whatsappClient.ts`) para iniciar a sessão persistente com geração de QR code via terminal.\n3. Criação do driver (`whatsappDriver.ts`) que efetuará o envio (copy + imagem) para o grupo/canal de destino.\n4. Integração no `dispatchWorker.ts` via `DriverFactory`, orquestrando o roteamento da oferta para o driver.\n5. O status de envio é atualizado em `DispatchLogModel`.
## 2026-09-13 — 12:36 — Driver Telegram (Bot API — automação total, disparo imediato)

**Contexto:** O solicitante comandou explicitamente "EXECUTE O DESENVOLVIMENTO: **Driver Telegram** (*Bot API — automação total, disparo imediato*)".

**Escopo aprovado (Execução Direta):**
1. **Driver do Telegram:** Criação de `telegramDriver.ts` usando a biblioteca `axios` para comunicação com a Telegram Bot API. O payload é ajustado para envio de foto caso a oferta possua imagem, ou apenas mensagem de texto (incluindo o fallback do affiliateUrl caso ausente).
2. **Integração no Dispatcher:** Atualização de `dispatchWorker.ts` para capturar a chave de canal 'telegram' e disparar o driver específico.
3. **Decriptação:** Utilização de `getDecryptedCredentials` em conformidade com as regras de segurança estabelecidas (botToken, chatId).
4. **Atualização da Documentação:** `DEVLOG.md` e `CHECKLIST.md` atualizados.
