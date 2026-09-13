# DOSSIÊ DE DESENVOLVIMENTO: AUTO AFFILIATE PUBLISHER

Documento central de planejamento do projeto (**Bíblia do Projeto**). Registra, em ordem cronológica, cada interação de ideação, decisão arquitetural, regra de negócio e correção de premissa. Toda atualização dos documentos periféricos (`GERAL.md`, `ARQUITETURA.md`, `FLUXO_OPERACIONAL.md`, `ESPECS_TECNICAS.md`, `TOOLS.md`, `MONETIZACAO.md` e `CHECKLIST.md`) nasce daqui.

---

<a id="interacao-1"></a>
## Interação 1

**Data de Registro:** 08 de Setembro de 2026

**Contexto/Pergunta:** MARCO FUNDACIONAL DO PROJETO — Consolidação da conversa inicial e dos 5 marcos/complementos de desenvolvimento registrados em 27 de Agosto de 2026 (00:58:59, 01:07:40, 01:15:43, 01:48:15, 01:50:26 e 01:54:42, horário de Brasília). Concepção de uma aplicação autônoma de curadoria e divulgação de ofertas de programas de afiliados em múltiplos canais (WhatsApp Canais, Telegram, Instagram, TikTok e site próprio), com coleta automatizada, refinamento de copy por IA, aprovação humana e disparo multicanal com fila anti-spam, auditoria por operador e sincronização em tempo real via WebSockets.

**Nota de Cronologia:** o material original registra o marco principal como `27/08/2026 12:58:59`, porém todos os complementos subsequentes estão datados entre `01:07:40` e `01:54:42` do mesmo dia. Assumido `00:58:59` para o marco principal, preservando a ordem crescente real dos eventos. Correção registrada aqui para rastreabilidade.

**Principais Pontos:**

1. **Conceito Central do Projeto**: sistema autônomo que se conecta a múltiplos programas de afiliados, captura ofertas ativas (título, preço original, preço atual, imagem, link), converte a URL em link rastreado de afiliado, gera o texto de divulgação e distribui em vários canais de audiência. O objetivo declarado pelo usuário é eliminar o trabalho manual repetitivo de "copiar e colar" ofertas o dia inteiro, mantendo o cadastro de afiliado gerando comissão de forma contínua.

2. **Correção de Premissa — A IA Não Navega nem Raspa a Web**: a ideia inicial do usuário previa uma Cron disparando uma mensagem para a IA, e a IA navegando nos sites, buscando as ofertas e gravando o resultado. Isso foi corrigido na própria conversa: navegação e extração por LLM são **caras, lentas e instáveis**. A arquitetura homologada separa responsabilidades de forma rígida — **captura de dados é código determinístico** (cliente de API, leitor de RSS/XML, scraper dirigido) e a **IA atua exclusivamente no refinamento textual** (copywriting, emojis, gatilhos de urgência, hashtags), recebendo um payload já estruturado. A IA nunca é a fonte do dado.

3. **Como as Plataformas de Afiliados Realmente Entregam Ofertas** (levantamento que sustenta o Ponto 2):
   - **APIs oficiais**: Shopee, AliExpress, Amazon e Mercado Livre expõem APIs de afiliados para consultar produtos em alta, gerar *deep links* rastreados e obter imagem/preço em tempo real.
   - **Redes de afiliados** (Awin, Rakuten, Lomadee): disponibilizam *feeds* de produtos em XML, CSV ou RSS, atualizados várias vezes ao dia.
   - **Webhooks**: existem, mas servem para **notificar venda confirmada / comissão gerada** — não para enviar promoções ativas continuamente. Isso responde diretamente à dúvida levantada pelo usuário ("não sei se existe webhook ou feed RSS").
   - **Scraping dirigido**: reservado a lojas sem API aberta, monitorando páginas específicas de oferta ("Ofertas do Dia") em intervalo configurável.

4. **Decisão Estruturante — Human-in-the-Loop (Curadoria com Aprovação Humana)**: proposta pelo próprio usuário como alternativa ao disparo 100% cego, e homologada como o modelo do projeto. A automação prepara tudo (busca, link de afiliado, imagem, copy) e **para**, deixando a oferta disponível num painel; a publicação só ocorre por clique humano. Justificativas registradas:
   - **Elimina o risco de banimento no WhatsApp**: o comportamento deixa de acionar os filtros heurísticos de spam da Meta, já que não há disparo automatizado em rajada.
   - **Filtro de relevância real**: a automação captura ofertas irrelevantes (ex.: 2% de desconto em produto caro) ou fora do nicho; o operador publica apenas o que converte.
   - **Proteção contra erro da IA**: o operador valida copy, preço e link antes de ir a público.
   - **Custo de operação por item**: o trabalho humano cai para 5 a 10 segundos por produto, contra o processo manual completo.

5. **Pipeline Oficial em 5 Etapas**:
   1. **Coleta (Crawler / API Ingestion)** — Cron dispara o script que consulta APIs de afiliados, lê feeds ou raspa páginas de desconto, salvando os dados brutos.
   2. **Conversão de Link** — a URL do produto é convertida na URL de afiliado usando a tag/ID do usuário.
   3. **Refinamento com IA** — o payload estruturado é enviado ao LLM, que devolve copy curta com emojis e gatilho de urgência (WhatsApp/Telegram), legenda com hashtags (Instagram) e postagem estruturada (site).
   4. **Persistência e Fila** — as mensagens geradas são armazenadas com status `aberta`, com deduplicação por ID do produto ou hash do link.
   5. **Distribuição (Publishing)** — um *dispatcher* lê a fila e envia para cada destino respeitando seus *rate limits*.

6. **Arquitetura de Dois Dashboards sobre Um Backend Único**: decisão explícita do usuário — "não tem porque criar outra aplicação". A aplicação é unificada, com dois pontos de entrada distintos:
   - **Dashboard Administrativo (Local)**: roda na máquina administrativa, gerencia fontes de coleta, credenciais/chaves de API, intervalos de varredura, prompts de IA por fonte, canais de destino, cadastro de operadores e visualização de logs de auditoria. Não é pensado para acesso remoto, embora tecnicamente possível.
   - **Dashboard Remoto (Colaborativo)**: acessível de qualquer lugar, inclusive celular, focado exclusivamente em curadoria e disparo, sincronizado em tempo real.

7. **Máquina de Estados da Oferta e Estrutura de Abas**: o dashboard remoto é dividido em três abas que espelham o ciclo de vida da oferta — **Abertas** (recém-capturadas, aguardando decisão, ordenadas de forma decrescente por data de resgate, entradas novas no topo), **Agendadas** (aprovadas, aguardando o cronômetro do delay anti-spam, exibindo horário previsto, canais escolhidos e contagem regressiva) e **Concluídas** (histórico de disparos confirmados). Existe ainda o estado terminal `descartada`, que retira a oferta da lista e alimenta o histórico que evita recapturar o mesmo item.

8. **Regra de Transição Instantâneo vs. Agendado**: se a fila de disparos estiver **vazia** no momento do clique, o item é processado imediatamente e migra direto de **Abertas** para **Concluídas**. Se já houver disparo em curso ou agendado, o item migra para **Agendadas** com o tempo calculado na fila e só chega a **Concluídas** quando o backend confirmar a publicação. O escalonamento é progressivo (item 1 imediato, item 2 em +3 min, item 3 em +6 min, e assim por diante), garantindo comportamento humanizado. O material de referência recomenda que intervalos entre 30 e 60 minutos são mais eficientes para preservar a audiência — o valor de 3 minutos fica registrado como **parâmetro de balanceamento configurável**, não como constante final.

9. **Estado Global Único e Controle de Concorrência via WebSocket**: a lista de ofertas existe em **um único estado centralizado no backend** — nenhuma instância do dashboard remoto possui lista isolada. Qualquer interação resolutiva dispara *broadcast* instantâneo para todos os clientes conectados, removendo o card da aba **Abertas** de todas as telas em milissegundos. Isso torna impossível a publicação duplicada por concorrência humana, requisito declarado como crítico pelo usuário. O mesmo mecanismo elimina a necessidade de recarregar a página: ofertas novas capturadas por uma Cron entram no topo da lista de todos os operadores em tempo real.

10. **Equivalência de Ação — "Copiar" Vale como "Publicar"**: para canais sem API direta (WhatsApp Canais e Instagram Stories), o botão **"Copiar para Área de Transferência"** é tratado pelo sistema com a **mesma gravidade de um disparo automatizado**. Ao ser clicado, o backend registra operador, data/hora e SKU, altera o status para `concluida` (ou `agendada`, se houver fila) e remove o item da tela de todos os operadores. A justificativa é determinística: não há como o sistema verificar se a colagem realmente ocorreu, logo entende-se o clique como publicação efetivada.

11. **Seletor Multicanal por Oferta**: cada card exibe um conjunto de *checkboxes* correspondente aos canais cadastrados no painel administrativo, com opção mestre **"Marcar/Desmarcar Todos"**. O comportamento padrão é **todas as caixas pré-marcadas**, para máxima agilidade — o operador apenas desmarca os canais que não fazem sentido para aquela oferta. Canais adicionados, editados ou desativados no painel administrativo refletem imediatamente na interface remota.

12. **Arquitetura Thin Client — Centralização da Execução**: o dashboard remoto **não processa envios e não armazena tokens sensíveis das redes**. Ele é estritamente uma interface de comando e visualização. Ao clicar em "Publicar", envia um payload de comando ao servidor da máquina administrativa, que bloqueia o item via WebSocket, encaminha as tarefas para a fila interna de disparos e delega aos *drivers* locais de cada canal a execução real em segundo plano.

13. **Sessão Simplificada de Operador e Presença Ativa**: o usuário inicialmente descartou qualquer noção de sessão, e depois reverteu para um modelo mínimo. Cadastro no painel administrativo com `id`, `nome` (obrigatório), `email` (opcional) e `status`. **Sem senha, sem token, sem fluxo de autenticação.** No dashboard remoto existe uma tela-portão anterior à listagem, onde o operador seleciona o próprio nome. O backend associa o socket daquela conexão ao `id` do usuário e emite `USUARIO_CONECTADO`; nas telas dos demais, nomes já em uso ficam **visualmente desabilitados** com a marcação "Em uso", impedindo que duas pessoas operem sob a mesma identidade. Ao desconectar, `USUARIO_DESCONECTADO` libera o nome instantaneamente.

14. **Auditoria para Comissionamento Futuro**: toda ação de despacho carrega a assinatura do operador. O sistema mantém o mapeamento entre SKU/ID do produto na loja e o operador que publicou, viabilizando que relatórios de vendas exportados das plataformas de afiliados sejam cruzados com a tabela de logs no futuro, calculando a comissão devida a cada colaborador. O usuário declarou explicitamente que o pagamento de comissões é **projeto futuro**, mas a estrutura de dados nasce pronta para ele. O painel administrativo inclui um visualizador de auditoria com filtros por data, operador, loja de origem e canal.

15. **Stack Tecnológica Homologada** (definida pelo usuário no marco de 01:54:42):
    - **Runtime**: Node.js v20+ com TypeScript estrito (`strict: true`). Preferência declarada por Node puro; scripts em Python ficam como *fallback* pontual apenas se houver necessidade estrita de *bypass* complexo em scraping.
    - **Servidor HTTP**: Fastify.
    - **Validação**: Zod, integrado ao Fastify.
    - **Banco de Dados**: MongoDB — escolha justificada pelo usuário pela facilidade de lidar com gravação de logs e grande volume de material textual.
    - **Tempo Real**: WebSocket no backend para sincronização do estado global.
    - **Filas e Delays**: BullMQ sobre Redis, já em uso pelo usuário em outras aplicações.
    - **Ingestão**: Playwright para páginas dinâmicas, Cheerio/Axios para páginas estáticas e feeds RSS/XML.
    - **Frontend**: Tabler.io UI Kit + Tailwind CSS. Requisito explícito do usuário: **sem animação e sem complexidade visual**, apenas as reações corretas e reatividade via WebSocket.

16. **Riscos e Restrições por Canal (Registrados como Restrição de Projeto)**:
    - **WhatsApp (Canais)** — viabilidade **média / não-oficial**. A Meta ainda restringe a Cloud API oficial para postagem em Canais. Automações dependem de bibliotecas/instâncias não-oficiais, com risco real de banimento. **Mitigação adotada: publicação assistida via botão "Copiar".**
    - **Telegram** — viabilidade **excelente**. Bot API 100% aberta, gratuita e sem limites rígidos de banimento para canais de promoções. É o canal mais seguro para automação total.
    - **Instagram** — viabilidade **alta e oficial** via Graph API para contas empresariais (foto/carrossel + legenda). Restrição relevante: **não permite link clicável em legenda** (apenas link na bio, sticker de link em Stories ou direct automático). Stories permanece no fluxo híbrido.
    - **TikTok** — restrições técnicas barram automação direta de criativos efêmeros sem aprovação complexa de desenvolvedor. Fluxo híbrido (copiar imagem + legenda pronta) garante segurança operacional.
    - **Site Próprio** — viabilidade **total**, alimentado via API/webhook, gerando posts catalogados e indexáveis para SEO.
    - **Regras dos programas de afiliados** — a Amazon proíbe explicitamente envio direto de links de afiliado em e-mails privados ou mensagens privadas fechadas sem identificação clara, embora permita canais abertos desde que a página/canal esteja cadastrada no perfil de associado. Restrição a observar no cadastro de canais.

17. **Cuidados Operacionais Obrigatórios**:
    - **Links quebrados e estoque**: ofertas relâmpago acabam rápido. O sistema precisa reverificar preço e disponibilidade **antes** de disparar para canais públicos.
    - **Histórico de preços**: o sistema armazena o histórico do item, permitindo saber se o produto está de fato no menor preço dos últimos 30 dias.
    - **Deduplicação**: itens descartados alimentam um histórico que evita recapturar o mesmo produto.

18. **Escalabilidade Gradual (Estratégia de Longo Prazo)**: quando houver métricas claras de quais formatos e nichos convertem melhor, a publicação automática pode ser habilitada **apenas para canais seguros** (Telegram e site próprio), mantendo a curadoria manual restrita a WhatsApp e Instagram. Registrado como evolução planejada, não como escopo inicial.

19. **Escopo desta Entrega**: esta interação registra a especificação fundacional completa do projeto (Fluxo 2 / `INSTRUCAO_DOSSIE.md`, apenas documentação). Nenhum código foi criado nesta sessão. Toda a documentação periférica do projeto foi criada em cascata a partir deste registro: `GERAL.md`, `ARQUITETURA.md`, `FLUXO_OPERACIONAL.md` (documento novo, proposto e aprovado nesta sessão para abrigar regras de domínio e ciclo de vida da oferta), `ESPECS_TECNICAS.md`, `TOOLS.md`, `MONETIZACAO.md` e `CHECKLIST.md` — este último populado com o backlog completo dos Sprints 1 a 3, todos os itens em estado **Pendente**. `DEVLOG.md` e `HISTORICO.md` permanecem intocados, conforme a regra de arquivos protegidos.

---

<a id="interacao-2"></a>
## Interação 2

**Data de Registro:** 08 de Setembro de 2026

**Contexto/Pergunta:** ESTRUTURAÇÃO INICIAL DO PROJETO — Encerramento da fase exclusivamente documental. O usuário determinou o início do desenvolvimento a partir das tasks de estruturação já registradas no `CHECKLIST.md`, acrescentando uma exigência não prevista na Interação 1: **o projeto deve ser um monorepo**. A sessão de execução resultante fechou três decisões técnicas que estavam em aberto e produziu a primeira base de código do projeto.

**Principais Pontos:**

1. **Exigência de Monorepo (Nova Decisão Estruturante)**: a Interação 1 homologou um backend único com dois dashboards, mas descreveu a organização física do código como um projeto único (`src/config`, `src/database`, `src/modules`, `src/server`, `src/client`). O usuário determinou a organização em **monorepo**. A decisão não altera o modelo de aplicação — continua havendo **um só processo servidor** e uma só base de dados —, altera a distribuição dos artefatos: o servidor, as duas interfaces e um pacote de contrato comum passam a ser workspaces independentes, com `package.json` e ciclo de build próprios.

2. **Preservação Integral das Fronteiras de Módulo**: a reorganização não inventou estrutura nova. Os diretórios `config`, `database/models` e os seis módulos (`ingestion`, `ai`, `dispatcher`, `queues`, `operators`, `websocket`) foram transportados 1:1 para dentro de `apps/api/src`, com os mesmos nomes e as mesmas responsabilidades. O antigo `src/client` desdobrou-se em `apps/dashboard-admin` e `apps/dashboard-remote`, refletindo que as duas interfaces têm públicos, ciclos de build e dependências distintos.

3. **`packages/shared` — Justificativa Técnica do Monorepo**: acréscimo que não existia na proposta original e que sustenta a decisão. Concentra os enums de estado, os DTOs em Zod e o catálogo tipado dos eventos WebSocket. Sem ele, esses contratos precisariam ser reescritos nos dashboards e mantidos manualmente em sincronia com o backend. Três consequências registradas: o estado global da oferta é declarado uma única vez; uma mudança de formato em evento de broadcast quebra a compilação do dashboard em vez da tela do operador em produção; e os DTOs compartilhados **não possuem campo de credencial** — a regra do Thin Client passa a ser sustentada pelo próprio tipo, não apenas pela disciplina de quem escreve a rota.

4. **Decisões Técnicas Fechadas nesta Interação** (todas estavam registradas como pendências no `CHECKLIST.md`, Categoria 8):
   - **Biblioteca de WebSocket: `@fastify/websocket`**, escolhida sobre o Socket.IO. Plugin nativo do Fastify, sem servidor paralelo nem protocolo próprio, suficiente para os seis eventos de broadcast e o controle de presença especificados.
   - **Camada de acesso ao MongoDB: Mongoose**, escolhida sobre o driver oficial. Motivo: schemas declarativos com os índices junto do model, o que acelera os CRUDs e mantém as cinco coleções legíveis. A transição atômica por `findOneAndUpdate`, base da trava anti-concorrência, permanece integralmente disponível.
   - **Stack dos dashboards: Vite + React + TypeScript**, mantendo Tabler.io como kit de componentes e Tailwind CSS como camada de utilitários. O Tailwind entra **sem o preflight**, porque o reset dele sobrescreveria os estilos base do Tabler. O requisito de "sem animações" da Interação 1 foi implementado como regra global de CSS que zera `animation` e `transition`.

5. **Fixação do TypeScript na Linha 5.9**: a major 7 já é a versão estável publicada, mas o `typescript-eslint` declara suporte apenas até `<6.1.0`. Manter o lint funcional prevaleceu sobre adotar a major mais recente. Registrado como decisão temporária, a reavaliar quando o `typescript-eslint` publicar suporte.

6. **Parâmetro Δ Deixa de Ser Conceito**: o intervalo do delay progressivo anti-spam existe agora como a variável de ambiente `DISPATCH_INTERVAL_MS`, validada na inicialização. Nenhum valor de delay é escrito diretamente na lógica. A definição do **valor operacional** foi definida para **45 minutos** (`2.700.000` ms), coerente com o registrado na Interação 1 (recomendação de mercado de 30 a 60 minutos), substituindo a referência inicial de 3 minutos.

7. **Restrições de Ambiente Encontradas na Execução** (registradas por afetarem a reprodutibilidade da infraestrutura local):
   - **MongoDB fixado temporariamente na versão 7**: as imagens 8.x recusam a inicialização na máquina do usuário com a mensagem `Linux kernel versions 6.19 and newer has a known incompatibility` (SERVER-121912). O kernel visto pelos containers é o 7.0.x da VM do Docker, ainda que o host reporte 6.17. Testadas e recusadas as tags `8`, `8.0` e `8.3`. A migração para a linha 8.x foi registrada como task pendente.
   - **Conflitos de porta com outros projetos da máquina**: a porta 27017 já está ocupada por outro MongoDB e a 5173 por outro processo de desenvolvimento. O ambiente local usa 27018 para o MongoDB e 5180/5181 para os dashboards, com as portas parametrizadas por variável de ambiente.

8. **Estado do Projeto ao Fim desta Interação**: as nove tasks de estruturação da Categoria 3 do `CHECKLIST.md` estão implementadas e verificadas — o backend sobe conectado a MongoDB e Redis, as cinco coleções existem com os quatro índices obrigatórios aplicados e conferidos no banco, e os dois dashboards consomem o contrato compartilhado. Permanecem pendentes os fluxos de ingestão, IA, publicação multicanal e curadoria, além das decisões em aberto sobre provedor de LLM, criptografia de credenciais, política de divergência de preço na reverificação e estratégia de exposição segura do Dashboard Remoto.

9. **Escopo desta Entrega**: a execução do código ocorreu sob o Fluxo 1 (`INSTRUCAO_EXECUCAO.md`), com plano registrado no `HISTORICO.md` e detalhamento no `DEVLOG.md`. O presente registro no dossiê e a atualização em cascata da documentação periférica ocorreram sob o Fluxo 2 (`INSTRUCAO_DOSSIE.md`). Documentos sincronizados nesta cascata: `ARQUITETURA.md` (Seções 1, 7 e 8), `ESPECS_TECNICAS.md`, `TOOLS.md`, `GERAL.md` e `CHECKLIST.md`. `DEVLOG.md` e `HISTORICO.md` não foram alterados no Fluxo 2, conforme a regra de arquivos protegidos.
