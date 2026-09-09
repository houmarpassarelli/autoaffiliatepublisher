# Auto Affiliate Publisher

Curadoria assistida e distribuição multicanal de ofertas de programas de afiliados. A automação descobre a oferta, converte o link, gera a copy com IA e para; a publicação exige clique humano.

A documentação de especificação está em [`GERAL.md`](./GERAL.md), que indexa todos os demais documentos do projeto.

## Estrutura do monorepo

| Workspace | Pacote | Papel |
| :--- | :--- | :--- |
| `packages/shared` | `@aap/shared` | Enums, schemas Zod e contratos WebSocket compartilhados. Fonte única de verdade dos tipos de domínio. |
| `apps/api` | `@aap/api` | Backend único: HTTP (Fastify), WebSocket, ingestão, IA, fila e drivers de disparo. |
| `apps/dashboard-admin` | `@aap/dashboard-admin` | Dashboard Administrativo (local): fontes, canais, operadores e auditoria. |
| `apps/dashboard-remote` | `@aap/dashboard-remote` | Dashboard Remoto (colaborativo): curadoria e disparo das ofertas. |

## Pré-requisitos

- Node.js 22.12 ou superior
- Docker e Docker Compose

## Primeira execução

```bash
cp .env.example .env    # ajuste as portas se já houver Mongo/Redis na máquina
npm install
npm run infra:up        # sobe MongoDB e Redis
npm run dev             # sobe o backend e os dois dashboards
```

| Serviço | Endereço |
| :--- | :--- |
| Backend | http://localhost:3333 (healthcheck em `/health`) |
| Dashboard Administrativo | http://localhost:5180 |
| Dashboard Remoto | http://localhost:5181 |

## Scripts

| Comando | Efeito |
| :--- | :--- |
| `npm run dev` | Backend, dashboards e o watcher do pacote compartilhado, em paralelo. |
| `npm run build` | Compila os quatro workspaces na ordem de dependência. |
| `npm run typecheck` | Verificação de tipos em todos os workspaces. |
| `npm run lint` / `npm run format` | ESLint e Prettier. |
| `npm run infra:up` / `infra:down` / `infra:logs` | Ciclo de vida dos containers locais. |

## Convenções

- Todo o código é escrito em **inglês**; todos os comentários, em **português do Brasil**.
- TypeScript em modo `strict` em todos os workspaces.
- Nenhum tipo de domínio é duplicado entre backend e dashboards: o contrato vive em `@aap/shared`.
