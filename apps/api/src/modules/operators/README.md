# Módulo de Operadores

Cadastro e presença ativa dos responsáveis pela curadoria.

## Rotas e seus dois públicos

| Rota | Dashboard | Devolve |
| :--- | :--- | :--- |
| `GET /api/operators/available` | Remoto | Só os ativos, com `id`, `name` e a marcação "Em uso" |
| `GET/POST/PUT/DELETE /api/operators` | Administrativo | Cadastro inteiro, inclusive os desativados |

A assimetria é deliberada: a tela-portão não precisa saber quem está desativado, e o painel precisa — é lá que se reativa um cadastro suspenso.

## O que distingue este CRUD dos outros dois

Fontes e canais são configuração inerte. Um operador pode estar **conectado** no instante em que o administrador o altera, e isso obriga a duas providências:

- **Desativar ou excluir encerra a sessão dele** (`revokeOperatorPresence`). Sem isso, a tela continuaria aberta e aparentemente funcional enquanto `requireActiveOperator` recusaria cada clique — o operador veria o quadro, decidiria sobre uma oferta e receberia um erro que não explica nada.
- **`isOnline` na listagem vem do registro de conexões vivas, não do banco.** O campo persistido é projeção do socket; uma projeção defasada mostraria como conectado quem já saiu. É a mesma escolha já feita na tela-portão.

Nenhum evento novo de WebSocket foi criado para isso. O catálogo do `ESPECS_TECNICAS.md`, Seção 3.1, tem seis eventos e o cliente já sabe voltar à tela-portão quando perde a identidade — o encerramento do socket reaproveita esse caminho inteiro.

## Regras não-negociáveis

- **Sem senha, sem token, sem autenticação.** A identificação existe para **atribuição de autoria** no comissionamento, não para controle de acesso. A proteção real do Dashboard Remoto é de rede — VPN, túnel reverso ou proxy autenticado (decisão em aberto).
- **Excluir é diferente de desativar.** A exclusão é recusada com 409 enquanto o operador assinar ofertas ou logs de disparo. O `DispatchLog` guarda o nome desnormalizado para preservar a autoria, mas `offers.operatorId` não guarda: a aba Concluídas perderia o autor. E `dispatch_logs` é insumo do rateio de comissão — apagar quem assinou é apagar a quem pagar.
- **`name` é único.** É o identificador visível na tela-portão: dois homônimos tornariam a seleção ambígua e corromperiam a autoria.
- **E-mail vazio é normalizado para `null`** no schema compartilhado, para que "não informado" não conviva com "informado em branco".

## Presença ativa

- A verdade sobre quem está online é o socket vivo, mantido em memória.
- Reconciliação de presença órfã por duas salvaguardas: varredor de heartbeat (queda sem `close` limpo) e reset no bootstrap (morte abrupta do processo).
