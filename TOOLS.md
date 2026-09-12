# Ferramentas, APIs Externas e Infraestrutura - Projeto Auto Affiliate Publisher

Este documento lista as plataformas de afiliados e suas APIs, os provedores de LLM, as APIs de publicação por canal, as bibliotecas de ingestão e a infraestrutura local do projeto **Auto Affiliate Publisher**.

---

## 1. Plataformas de Afiliados (Fontes de Oferta)

### 1.1. APIs Oficiais — Caminho Preferencial

| Plataforma | Recurso | Observação |
| :--- | :--- | :--- |
| **Shopee Affiliate** | API de afiliados | Consulta de produtos em alta, geração de *deep link* rastreado, imagem e preço em tempo real. |
| **AliExpress Portals** | API de afiliados | Mesmo padrão: catálogo, conversão de link e dados de preço. |
| **Amazon Associates (PA-API)** | Product Advertising API | Consulta de produtos e geração de link com tag. **Atenção às regras do programa** (ver Seção 5). |
| **Mercado Livre Afiliados** | API pública + programa | Catálogo e conversão de link. |

**Vantagem estrutural:** com API oficial não há raspagem, não há quebra por mudança de layout e os dados de preço são confiáveis.

### 1.2. Redes de Afiliados — Feeds de Produto

| Rede | Formato | Frequência |
| :--- | :--- | :--- |
| **Awin** | XML / CSV | Atualizado várias vezes ao dia. |
| **Rakuten Advertising** | XML / CSV | Atualizado várias vezes ao dia. |
| **Lomadee** | XML / RSS | Atualizado várias vezes ao dia. |

### 1.3. Webhooks — O Que Eles Realmente São

Registro importante levantado na Interação 1 do `DOSSIE.md`: os webhooks dos programas de afiliados servem para **notificar venda confirmada e comissão gerada** — **não** para enviar promoções ativas continuamente.

Consequência prática: webhooks **não são fonte de ingestão**. São, porém, o insumo natural para o **cruzamento de comissionamento** descrito em `MONETIZACAO.md`.

### 1.4. Scraping Dirigido — Último Recurso

Reservado a lojas sem API aberta. Aponta para páginas específicas de oferta ("Ofertas do Dia"), nunca para varredura ampla do site.

---

## 2. Bibliotecas de Ingestão

| Ferramenta | Uso no projeto | Quando escolher |
| :--- | :--- | :--- |
| **Axios** | Requisições HTTP a APIs e download de feeds. | Sempre que houver API ou feed. |
| **Cheerio** | Parsing de HTML estático e XML/RSS. | Páginas renderizadas no servidor; feeds. |
| **Playwright** | Navegador headless. | Páginas dinâmicas, SPAs, conteúdo carregado por JavaScript. |
| **node-cron** | Agendamento das varreduras por fonte. | Intervalo configurado por fonte no banco. |

> **Fallback em Python:** previsto apenas para casos de *bypass* genuinamente complexo que o Node não resolva. A preferência declarada pelo usuário é **Node puro**; qualquer script Python é exceção justificada, não regra.

---

## 3. Inteligência Artificial (Refinamento de Copy)

### 3.1. Papel Restrito da IA

A IA recebe um payload **já estruturado** (título, preços, desconto, especificações, loja) mais o `aiPromptTemplate` da fonte, e devolve as variantes de copy. Ela **nunca** navega, **nunca** raspa e **nunca** recebe HTML bruto para extrair. Essa fronteira é a decisão arquitetural central do projeto (Interação 1, Ponto 2 do `DOSSIE.md`).

### 3.2. Saídas Esperadas

| Variante | Destino | Características |
| :--- | :--- | :--- |
| `messaging` | WhatsApp, Telegram | Copy curta, emojis, gatilho de urgência, link de afiliado inline. |
| `social` | Instagram, TikTok | Legenda com hashtags estratégicas. Link **não é clicável** no Instagram. |
| `article` | Site próprio | Postagem estruturada, indexável para SEO. |

### 3.3. Escolha do Provedor

**Decisão em aberto.** Os critérios registrados para a escolha são: custo por oferta processada, latência aceitável no pipeline de background, e qualidade de escrita comercial em português do Brasil. O custo unitário entra diretamente no cálculo de `MONETIZACAO.md`.

---

## 4. APIs de Publicação por Canal

| Canal | Ferramenta | Viabilidade | Nota |
| :--- | :--- | :---: | :--- |
| **Telegram** | Bot API | **Excelente** | 100% aberta e gratuita, sem limites rígidos de banimento para canais de promoções. É o canal ideal para automação total. |
| **Site Próprio** | API interna do CMS (ex.: WordPress REST API) ou escrita direta em banco | **Total** | Sem restrição. Gera conteúdo indexável. |
| **Instagram (Feed/Carrossel)** | Meta Graph API (conta empresarial vinculada ao Facebook) | **Alta / oficial** | Permite postar foto/carrossel com legenda. **Não permite link clicável em legenda** — apenas link na bio, sticker em Stories ou direct automático. |
| **Instagram (Stories)** | — | **Assistida** | Automação de criativo efêmero exige aprovações complexas de desenvolvedor. Fluxo híbrido: copiar imagem + legenda. |
| **TikTok** | — | **Assistida** | Mesma restrição de criativo efêmero. |
| **WhatsApp (Canais)** | Biblioteca Não-Oficial | **Automação** | Automação total assumida. Risco de banimento aceito (ver 4.1). |

### 4.1. WhatsApp — Nota de Risco Explícita

Não existe API oficial da Meta para postagem em **Canais** de WhatsApp. As alternativas disponíveis são bibliotecas e instâncias **não-oficiais** (implementações em Node ou Go que operam sobre o protocolo do WhatsApp Web).

**Riscos registrados:**
- Banimento do número utilizado, exigindo "aquecimento de chip" e disciplina de volume.
- Quebra sem aviso a cada mudança do protocolo pela Meta.
- Violação dos termos de uso da plataforma.

**Decisão adotada pelo projeto:** o WhatsApp operará com **automação total via biblioteca não-oficial** (como Baileys ou whatsapp-web.js). O risco de banimento por comportamento automatizado foi **aceito**. O uso do modo puramente assistido (copiar e colar) ficará como um fallback. A implementação do driver para o disparo lidará com a persistência de sessão e QR Code.

---

## 5. Regras dos Programas de Afiliados (Compliance)

| Programa | Regra a observar |
| :--- | :--- |
| **Amazon Associates** | Proíbe explicitamente o envio de links de afiliado em e-mails privados ou mensagens privadas fechadas sem identificação clara. Canais abertos são permitidos **desde que a página/canal esteja cadastrada no perfil de associado**. |
| **Geral** | Divulgação de vínculo de afiliado costuma ser exigida. Verificar a política de cada programa antes de cadastrar a fonte. |

Essa verificação faz parte do cadastro de uma fonte no Dashboard Administrativo — não é um passo automatizável.

---

## 6. Stack de Aplicação

| Ferramenta | Versão / Nota | Papel |
| :--- | :--- | :--- |
| **Node.js** | v22.12+ | Runtime único da aplicação. |
| **TypeScript** | 5.9, `strict: true` | Tipagem obrigatória em todo o código. Fixado na linha 5.9 porque o `typescript-eslint` ainda não suporta a major 7. |
| **Fastify** | — | Servidor HTTP, plugins e rotas. |
| **Zod** | Via *type provider* do Fastify | Validação de payloads e DTOs. |
| **MongoDB** | **Mongoose** | Persistência. Escolha do usuário pela facilidade com logs e volume textual. O Mongoose foi adotado pelos schemas declarativos com os índices junto do model. |
| **Redis** | — | Backend da fila BullMQ. |
| **BullMQ** | — | Fila de disparos com delay progressivo, retentativas e concorrência. |
| **@fastify/websocket** | **Escolhido** sobre o Socket.IO | Sincronização do estado global e presença de operadores. Plugin nativo do Fastify, sem servidor paralelo nem protocolo próprio. |

---

## 7. Frontend dos Dashboards

| Ferramenta | Papel |
| :--- | :--- |
| **Vite** | Servidor de desenvolvimento e empacotador dos dois dashboards, com proxy para o backend. |
| **React + TypeScript** | Camada reativa das interfaces, alimentada pelos eventos de WebSocket. |
| **Tabler.io UI Kit** | Biblioteca de componentes já utilizada pelo usuário — botões, modais, tabelas, formulários e cards. |
| **Tailwind CSS** | Utilitários de estilo e estruturação de layout. Importado **sem o preflight**, que sobrescreveria os estilos base do Tabler. |

**Requisito explícito do usuário:** as interfaces **não devem ter animações** nem complexidade visual. Apenas as reações corretas e reatividade em tempo real via WebSocket. O requisito está implementado como regra global de CSS que zera `animation` e `transition`.

---

## 8. Infraestrutura Local

A aplicação roda na **máquina administrativa**, que concentra:
- O servidor Fastify (HTTP + WebSocket).
- Os workers de ingestão e de disparo.
- Todas as credenciais de API e tokens de canal.

| Serviço | Provisionamento | Papel |
| :--- | :--- | :--- |
| **MongoDB** | Docker Compose local (`mongo:7`) | Persistência de fontes, ofertas, operadores, canais e logs. |
| **Redis** | Docker Compose local (`redis:8-alpine`) | Fila BullMQ. |

> **Nota de versão do MongoDB:** a imagem está fixada na linha 7 em caráter temporário. As imagens 8.x recusam a inicialização na máquina administrativa com a mensagem `Linux kernel versions 6.19 and newer has a known incompatibility` (SERVER-121912), porque o kernel visto pelos containers é o 7.0.x da VM do Docker. A migração para a linha 8.x está registrada como task pendente no `CHECKLIST.md`.

**Portas:** todas as portas publicadas são parametrizadas por variável de ambiente, porque a máquina administrativa pode já ter serviços ocupando as portas padrão. O ambiente local em uso adota 27018 para o MongoDB, 6379 para o Redis, 3333 para o backend e 5180/5181 para os dashboards administrativo e remoto.

**Exposição do Dashboard Remoto:** como não há autenticação real no código do sistema (ver `ESPECS_TECNICAS.md`, Seção 2.3), o acesso remoto é feito de forma segura via **Cloudflare Tunnels (Zero Trust)**. O túnel reverso expõe o serviço sem abrir portas locais (contornando CGNAT), enquanto a camada Zero Trust provê o bloqueio de acesso (autenticação via e-mail OTP/SSO) antes que a requisição chegue ao sistema. Para configuração, consulte o documento `INFRA_EXPOSICAO.md`.
