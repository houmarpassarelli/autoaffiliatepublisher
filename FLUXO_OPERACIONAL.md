# Fluxo Operacional e Regras de Domínio - Projeto Auto Affiliate Publisher

Este documento concentra as **regras de negócio** do projeto: ciclo de vida da oferta, máquina de estados, sistema de abas, controle de concorrência entre operadores, equivalência entre ações de publicação, seletor multicanal, sessão simplificada, presença ativa e política anti-spam. A implementação técnica dessas regras está em `ARQUITETURA.md` e `ESPECS_TECNICAS.md`.

---

## 1. O Modelo Human-in-the-Loop

A automação prepara **tudo** e para. A publicação exige clique humano.

| Etapa | Executor | Custo de tempo |
| :--- | :--- | :--- |
| Descobrir a oferta | Máquina | 0 (background) |
| Gerar link de afiliado | Máquina | 0 (background) |
| Baixar imagem e preços | Máquina | 0 (background) |
| Escrever a copy | Máquina (IA) | 0 (background) |
| **Decidir se publica** | **Humano** | **5 a 10 segundos** |
| Disparar nos canais | Máquina | 0 (background) |

**O que este modelo resolve:**
1. **Banimento por spam** — sem disparo automatizado em rajada, os filtros heurísticos da Meta não são acionados.
2. **Ofertas irrelevantes** — a automação captura descontos irrisórios ou itens fora do nicho; o operador filtra.
3. **Erro da IA** — copy, preço e link são validados por um humano antes de irem a público.

---

## 2. Ciclo de Vida da Oferta (Máquina de Estados)

```
             [Coleta + Refinamento por IA]
                        │
                        ▼ (entra no topo da lista via broadcast WebSocket)
                 ┌──────────────┐
                 │   ABERTAS    │─────────────► [DESCARTADA]
                 └──────┬───────┘   (alimenta histórico anti-recaptura)
                        │
              [Operador clica "Publicar" ou "Copiar"]
                        │
            ┌───────────┴────────────┐
            ▼ (fila vazia)           ▼ (fila ocupada)
   [Disparo Instantâneo]      ┌──────────────┐
            │                 │  AGENDADAS   │
            │                 └──────┬───────┘
            │                        │ (horário do agendamento atingido)
            │                        ▼
            └───────────────►┌──────────────┐
                             │  CONCLUÍDAS  │
                             └──────────────┘
```

### 2.1. Estados

| Estado | Significado | Transições possíveis |
| :--- | :--- | :--- |
| `aberta` | Capturada, processada pela IA, aguardando decisão do operador. | → `agendada`, `concluida`, `descartada` |
| `agendada` | Aprovada, aguardando o cronômetro do delay anti-spam. | → `concluida` |
| `concluida` | Disparada com sucesso, ou marcada como publicada via clipboard. | (terminal) |
| `descartada` | Rejeitada pelo operador. Sai da lista e entra no histórico que evita recapturar o mesmo item. | (terminal) |

### 2.2. Regra de Transição — Instantâneo vs. Agendado

- **Fila de disparos vazia no momento do clique** → o item é processado imediatamente e migra **direto de `aberta` para `concluida`**, sem passar por `agendada`.
- **Já existe disparo em curso ou agendado** → o item migra de `aberta` para `agendada`, com o tempo calculado na fila, e só chega a `concluida` quando o backend confirmar a publicação.

---

## 3. Sistema de Abas do Dashboard Remoto

### 3.1. Aba "Abertas" (Novas / Pendentes)

- Exibe todas as ofertas recém-capturadas e processadas pela IA que aguardam decisão.
- **Ordenação estrita**: decrescente por data/hora de resgate — os itens mais recentes entram **dinamicamente no topo** da lista.
- **Controles por card**: seletor de canais (*checkboxes* com "Marcar Todos" ativo por padrão), botão "Publicar", botão "Copiar para Área de Transferência" e botão "Descartar".
- **Conteúdo do card**: imagem do produto, título original, preço de/por, desconto percentual calculado, loja de origem e a copy formatada pela IA.

### 3.2. Aba "Agendadas" (Na Fila de Disparo)

- Exibe as ofertas aprovadas que aguardam o cronômetro do delay anti-spam.
- Mostra **horário previsto de envio**, **canais selecionados** e **contagem regressiva** para cada item.

### 3.3. Aba "Concluídas" (Publicadas)

- Histórico das ofertas já disparadas com sucesso nos respectivos canais.
- Serve como log visual imediato para consulta de preços e comprovação de disparo.

---

## 4. Estado Global Único e Controle de Concorrência

### 4.1. Fonte Única da Verdade

A lista de ofertas abertas existe em **um único estado centralizado no backend**. Nenhuma instância do dashboard remoto mantém lista isolada ou descolada do servidor. Todos os operadores conectados visualizam simultaneamente o mesmo estado global.

### 4.2. Broadcast Imediato

Qualquer interação **resolutiva** sobre uma oferta dispara um evento de broadcast instantâneo para todos os clientes conectados. O card é removido da aba **Abertas** de todos os operadores em milissegundos, **tornando impossível a publicação duplicada por concorrência humana**.

### 4.3. Reatividade sem Recarregamento

Nenhuma ação exige recarregar a página. Cenário de referência:

> Uma Cron traz 5 ofertas. Elas aparecem em **Abertas** para todos. O operador publica 3: a primeira dispara na hora e vai para **Concluídas**; as outras duas entram em **Agendadas**. Enquanto isso, outra Cron dispara e traz novas ofertas — elas entram **no topo** da aba **Abertas** de todos os operadores, em tempo real, sem nenhuma atualização manual de página.

---

## 5. Equivalência de Ação — "Copiar" Vale como "Publicar"

Para canais sem API direta de postagem e que não possuam driver automatizado (Instagram Stories, TikTok), o botão **"Copiar para Área de Transferência"** é tratado pelo sistema com a **mesma gravidade e o mesmo peso de um disparo automatizado**.

**Fluxo:**
1. O operador clica em "Copiar".
2. A interface copia a mensagem completa e formatada (com o link de afiliado) para a área de transferência.
3. O sinal de conclusão é enviado ao backend.
4. O backend registra operador, data/hora, SKU e canais; altera o status para `concluida` (ou `agendada`, se houver fila).
5. O item sai imediatamente da tela de **todos** os operadores conectados.

**Justificativa registrada:** não existe forma de o sistema verificar se a colagem realmente ocorreu no canal. Entende-se, de forma determinística, que o clique no botão configura uma publicação em andamento. Se de fato foi colada ou não, é responsabilidade do operador.

---

## 6. Seletor Multicanal por Oferta

- Cada card exibe um conjunto de *checkboxes* correspondente aos **canais cadastrados no Dashboard Administrativo**.
- **Opção mestre**: "Marcar/Desmarcar Todos", para habilitar ou desabilitar todos os destinos com um único clique.
- **Comportamento padrão**: **todas as caixas vêm pré-marcadas**, garantindo agilidade máxima ao operador — basta desmarcar os canais em que aquela oferta não faz sentido.
- **Sincronização**: qualquer canal adicionado, editado ou desativado no painel administrativo reflete imediatamente na interface remota.

---

## 7. Sessão Simplificada de Operador

### 7.1. Cadastro (Dashboard Administrativo)

| Campo | Obrigatório | Observação |
| :--- | :--- | :--- |
| `id` | Sim | Identificador único, gerado pelo sistema. |
| `nome` | Sim | Nome do operador, exibido na tela de seleção. |
| `email` | Não | Apenas referência de contato. |
| `status` | Sim | Ativo / Inativo. |

**Sem senha, sem token, sem fluxo de autenticação.** A escolha é deliberada: a operação precisa ser ágil e direta, e o objetivo da identificação não é segurança de acesso, é **atribuição de autoria** para o comissionamento futuro.

### 7.2. Tela-Portão de Seleção (Dashboard Remoto)

Antes de acessar a listagem de ofertas, o operador vê uma tela inicial com a lista de nomes cadastrados e seleciona o próprio nome.

### 7.3. Controle de Presença Ativa

- Ao selecionar o nome e entrar, o backend associa o socket daquela conexão ao `id` do operador e emite `USUARIO_CONECTADO` para todos os clientes.
- Nas telas de entrada dos demais dispositivos, os **nomes já em uso ficam visualmente desabilitados**, com a marcação **"Em uso"** — impedindo que duas pessoas operem sob a mesma identidade simultaneamente.
- Ao fechar a aba ou desconectar, `USUARIO_DESCONECTADO` é emitido e libera o nome instantaneamente.

### 7.4. O que a Sessão NÃO Faz

A lista de ofertas **permanece global**. A sessão não segmenta conteúdo: todos os operadores veem exatamente as mesmas ofertas, no mesmo estado. A única diferença que a sessão introduz é **quem assina a ação** quando um item é publicado ou copiado.

---

## 8. Rastreamento de Ações e Auditoria

Toda ação de despacho carrega a assinatura do operador responsável. Ao clicar em "Publicar" ou "Copiar para Área de Transferência", o backend grava o vínculo imediato entre o item e o operador, incluindo canais selecionados, SKU do produto, preço no momento do disparo e *timestamp*.

**Finalidade declarada:** viabilizar que relatórios de vendas e conversões exportados das plataformas de afiliados (Amazon, Shopee, Mercado Livre, etc.) sejam **cruzados** com a tabela de logs, calculando a comissão devida a cada colaborador. O pagamento de comissões é **projeto futuro**; a estrutura de dados nasce pronta para ele.

O Dashboard Administrativo expõe um visualizador de auditoria com filtros por data, operador, loja de origem e canal de destino.

---

## 9. Política Anti-Spam e Cuidados Operacionais

### 9.1. Delay Progressivo

Cliques em sequência não geram disparos simultâneos. Cada item aprovado entra na fila com escalonamento progressivo em relação ao anterior. O intervalo é **parâmetro configurável**: valor de referência inicial de 3 minutos, com a observação de mercado de que intervalos de 30 a 60 minutos preservam melhor a audiência e reduzem o risco de acionar filtros anti-spam.

### 9.2. Verificação Pré-Disparo

Ofertas relâmpago acabam rápido. Antes de disparar para canais públicos, o sistema deve **reverificar preço e disponibilidade** — link quebrado ou preço desatualizado queima a credibilidade do canal.

### 9.3. Histórico de Preços

O sistema armazena o histórico do item, permitindo identificar se o produto está de fato no menor preço do período recente — insumo para a decisão editorial do operador.

### 9.4. Deduplicação

Itens já capturados e itens descartados alimentam um histórico que impede a recaptura do mesmo produto, evitando republicação e poluição da fila.

### 9.5. Restrições por Canal

| Canal | Modo | Restrição registrada |
| :--- | :--- | :--- |
| **Telegram** | Automação total | Bot API aberta, gratuita, sem limites rígidos de banimento para canais de promoções. |
| **Site Próprio** | Automação total | Sem restrição. Conteúdo indexável para SEO. |
| **Instagram (Feed)** | Automação oficial | Graph API com conta empresarial. **Não permite link clicável em legenda.** |
| **Instagram (Stories)** | Assistido | Automação de criativo efêmero inviável sem aprovação complexa. |
| **TikTok** | Assistido | Mesma restrição de criativo efêmero. |
| **WhatsApp (Canais)** | Automação total (não-oficial) | **Sem API oficial de postagem em Canais.** Automação implementada via biblioteca com risco de banimento aceito. |
| **Amazon (programa)** | Regra do programa | Proíbe envio de links de afiliado em mensagens privadas fechadas sem identificação clara. Canais abertos são permitidos desde que cadastrados no perfil de associado. |

---

## 10. Escalabilidade Gradual (Evolução Planejada)

Quando houver métricas claras de quais formatos e nichos convertem melhor, a **publicação automática** poderá ser habilitada apenas para os **canais seguros** (Telegram e site próprio), mantendo a curadoria manual restrita a WhatsApp e Instagram. Registrado como evolução futura, fora do escopo inicial.
