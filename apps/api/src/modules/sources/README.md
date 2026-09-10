# Módulo de Fontes de Coleta

CRUD das fontes que alimentam o pipeline de ingestão. Rotas exclusivas do Dashboard Administrativo.

## O que a fonte concentra

Tudo que é específico de uma loja fica aqui, e não espalhado pelo pipeline: as credenciais de API, a tag de afiliado usada na conversão de link, o ritmo de varredura (`cronExpression`) e o **prompt customizado da IA** (`aiPromptTemplate`). Os módulos de ingestão e de IA leem a fonte; nenhum deles guarda configuração própria.

## Regras não-negociáveis

- **Credencial não volta ao cliente.** O DTO devolve `credentialKeys` — os nomes das chaves cadastradas — e nunca os valores. A regra é sustentada pelo tipo: `SourceDto` sequer declara um campo `credentials`.
- **A escrita de credencial é merge patch.** Como o cliente nunca teve os valores, ele não pode reenviá-los inteiros numa edição. Só as chaves presentes no patch são tocadas, e `null` é o comando explícito de remoção. A mecânica é compartilhada com os canais em `database/credentials.ts`.
- **Excluir é diferente de desativar.** A exclusão é recusada com 409 enquanto existir oferta apontando para a fonte: `offers.sourceId` é o que resolve a loja de origem exibida no card do dashboard remoto, inclusive nas ofertas já concluídas, consultadas como comprovação de disparo. `active: false` é a operação do dia a dia — interrompe a varredura sem apagar procedência.
- **`name` é único.** É o identificador usado nos filtros do painel de auditoria. A colisão volta como 409 nomeando o campo, e não como 500 (`server/mongoErrors.ts`).

## Validação da `cronExpression`

Validada no cadastro, campo a campo, contra a faixa de cada um dos cinco campos do dialeto do `node-cron` (`packages/shared`, `commonSchemas.ts`). É validação de **formato**: existe para que uma expressão inválida seja recusada no formulário, e não meses depois, em silêncio, dentro do worker de ingestão. A validação semântica final continua sendo do próprio `node-cron`, quando a Demanda 1.3 trouxer o scheduler.

## Pendências que atravessam este módulo

- **Criptografia em repouso** das credenciais — decisão em aberto (`CHECKLIST.md`, Categoria 8). Entrará em `database/credentials.ts`, sem alterar o contrato do model nem o DTO.
- **`POST /api/sources/:id/run`** — disparo manual de varredura. Depende do motor de ingestão e é item próprio da Categoria 4.
- **`lastRunAt`** é escrito pelo worker de ingestão, não por este CRUD. Hoje nasce `null` e assim permanece.
