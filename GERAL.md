# Visão Geral e Contexto - Projeto Auto Affiliate Publisher

Este documento fornece a visão geral executiva, contextualização de mercado, justificativa do modelo operacional e o índice remissivo de toda a documentação do projeto **Auto Affiliate Publisher**.

---

## 1. Resumo Executivo

**Auto Affiliate Publisher** é uma aplicação de **curadoria assistida e distribuição multicanal de ofertas de programas de afiliados**. O sistema automatiza integralmente o trabalho pesado — descobrir ofertas em APIs, feeds e páginas de lojas parceiras, converter URLs em links rastreados de afiliado, baixar imagens e gerar o texto de divulgação com IA — e entrega o resultado pronto num painel onde um operador humano decide, em 5 a 10 segundos por item, o que vai ao ar e em quais canais.

A aplicação é **unificada em um backend único** (Node.js + TypeScript + Fastify + MongoDB), controlada por **duas interfaces distintas**:

- **Dashboard Administrativo (Local)** — configuração de fontes de coleta, credenciais de API, intervalos de varredura, prompts de IA por fonte, canais de destino, cadastro de operadores e auditoria.
- **Dashboard Remoto (Colaborativo)** — curadoria e disparo, acessível de qualquer dispositivo, com estado global sincronizado em tempo real via WebSockets entre todos os operadores conectados.

O diferencial arquitetural é o modelo **Human-in-the-Loop**: a automação prepara tudo e para, e a publicação exige clique humano. Isso resolve simultaneamente os três riscos críticos de uma automação cega — banimento por spam nas redes sociais, divulgação de ofertas irrelevantes e propagação de erros da IA.

---

## 2. O Problema que o Projeto Resolve

Operações de divulgação de ofertas por afiliados são, na prática, um trabalho manual de repetição contínua: caçar promoções em dezenas de lojas, conferir se o desconto é real, gerar o link rastreado, baixar a foto, escrever a legenda e colar em cada canal de audiência — o dia inteiro, todos os dias.

O **Auto Affiliate Publisher** transfere 100% dessa preparação para a máquina e reserva ao humano exclusivamente a decisão editorial: *esta oferta merece ir ao ar?* O ganho não é apenas de tempo, é de **escala segura** — múltiplos operadores podem trabalhar sobre a mesma fila global de ofertas sem risco de publicação duplicada, porque o estado é centralizado e sincronizado por WebSocket.

---

## 3. Princípios de Arquitetura (Não-Negociáveis)

| Princípio | Justificativa |
| :--- | :--- |
| **A IA não navega nem raspa** | Coleta é código determinístico (API/RSS/scraper). A IA recebe payload estruturado e devolve apenas texto. Navegação por LLM é cara, lenta e instável. |
| **Estado global único** | A lista de ofertas vive no backend. Nenhum dashboard mantém lista isolada. Impede publicação duplicada por concorrência humana. |
| **"Copiar" é ação resolutiva** | Não há como verificar se a colagem ocorreu. O clique no botão de copiar tem o mesmo peso de um disparo automatizado e remove o item da fila de todos. |
| **Thin Client no remoto** | O dashboard remoto nunca guarda token de rede social nem publica direto. Envia comando; a máquina administrativa executa. |
| **Fila anti-spam obrigatória** | Disparos sequenciais recebem delay progressivo. Comportamento humanizado evita filtros heurísticos das plataformas. |
| **Auditoria desde o dia 1** | Toda ação carrega assinatura do operador. A estrutura de comissionamento nasce pronta, mesmo sem o cálculo implementado. |

---

## 4. Análise de Mercado e Fontes de Oferta (Benchmarks)

1. **APIs Oficiais de Afiliados (Shopee, AliExpress, Amazon, Mercado Livre)**
   - *Uso no projeto*: fonte primária. Permitem consultar produtos em alta, gerar *deep links* rastreados e obter imagem/preço em tempo real, sem qualquer raspagem.
2. **Redes de Afiliados (Awin, Rakuten, Lomadee)**
   - *Uso no projeto*: fonte secundária de alto volume. Disponibilizam feeds de produtos em XML, CSV ou RSS, atualizados várias vezes ao dia.
3. **Webhooks das Plataformas**
   - *Lição registrada*: webhooks de afiliados servem para **notificar venda confirmada / comissão gerada**, não para enviar promoções ativas. Não são fonte de ingestão — são insumo futuro para o cruzamento de comissionamento.
4. **Telegram Bot API**
   - *Lição*: referência de canal ideal para automação total — API aberta, gratuita e sem limites rígidos de banimento para canais de promoções.
5. **Meta Graph API (Instagram Business)**
   - *Lição*: automação oficial viável para feed e carrossel, com a restrição estrutural de **não permitir link clicável em legenda**. Define a necessidade do fluxo híbrido para Stories.
6. **WhatsApp Canais**
   - *Lição*: ausência de API oficial de postagem em Canais define o modelo de **publicação assistida** (botão "Copiar") como a única via segura contra banimento.

---

## 5. Índice Geral da Documentação do Projeto

1. 📓 **[DOSSIE.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/DOSSIE.md)**:
   - Bíblia do projeto. Histórico cronológico de todas as interações, decisões arquiteturais, correções de premissa e regras de negócio. **Porta de entrada para toda atualização de documentação.**
2. 🏛️ **[ARQUITETURA.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ARQUITETURA.md)**:
   - Stack tecnológica, os 5 módulos do sistema (Ingestão, IA, Dashboard Admin, Dashboard Remoto, Publicação Multicanal), pipeline de 5 etapas, comunicação híbrida REST + WebSocket, fila BullMQ com delay progressivo, arquitetura Thin Client e estrutura de diretórios.
3. 🔄 **[FLUXO_OPERACIONAL.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/FLUXO_OPERACIONAL.md)**:
   - Regras de domínio: ciclo de vida da oferta (máquina de estados), sistema de abas, controle de concorrência, equivalência "Copiar = Publicar", seletor multicanal, sessão simplificada de operador, presença ativa e política anti-spam.
4. 📐 **[ESPECS_TECNICAS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/ESPECS_TECNICAS.md)**:
   - Schemas MongoDB (`sources`, `offers`, `operators`, `channels`, `dispatch_logs`), catálogo de eventos WebSocket, payloads de comando, fórmula do delay progressivo, regra de deduplicação e contratos de integração.
5. 🛠️ **[TOOLS.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/TOOLS.md)**:
   - Plataformas de afiliados e suas APIs, provedores de LLM, Telegram Bot API, Meta Graph API, bibliotecas de WhatsApp (com nota de risco), bibliotecas de scraping e infraestrutura local (Docker, MongoDB, Redis).
6. 💰 **[MONETIZACAO.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/MONETIZACAO.md)**:
   - Modelo de receita por comissão de afiliado, estrutura de rateio para operadores colaboradores, custos operacionais (tokens de LLM, proxies, infraestrutura) e o cruzamento de dados que viabiliza o comissionamento.
7. 📋 **[CHECKLIST.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/CHECKLIST.md)**:
   - Status completo de desenvolvimento por fluxo de execução, com o backlog dos Sprints 1 a 3.
8. 🧭 **[DIRECIONADOR.md](file:///home/houmar/Workspace/AutoAffiliatePublisher/DIRECIONADOR.md)**:
   - Raiz de processamento de comandos da IA. Define qual conjunto de regras (`INSTRUCAO_DOSSIE.md` ou `INSTRUCAO_EXECUCAO.md`) se aplica a cada tipo de solicitação.
