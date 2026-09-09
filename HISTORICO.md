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
