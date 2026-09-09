# Módulo de Filas (BullMQ)

Fila central de disparos sobre Redis, com a política anti-spam do projeto.

## Regra central

- **Fila vazia no momento do clique** → disparo imediato; a oferta migra direto de `OPEN` para `COMPLETED`.
- **Fila ocupada** → a oferta entra em `SCHEDULED` com delay progressivo em relação ao último job enfileirado, e só migra para `COMPLETED` quando o backend confirmar a publicação.

## Escopo previsto (Sprint 2)

- Configuração da fila e do worker de disparo.
- Cálculo do instante de disparo conforme a fórmula de `ESPECS_TECNICAS.md`, Seção 7.
- Retentativas e concorrência controlada por canal.
- Broadcast de `OFFER_PUBLISHED` na conclusão de cada job.

## Decisão em aberto

Valor operacional do intervalo Δ (`DISPATCH_INTERVAL_MS`). Referência inicial de 3 minutos; o levantamento de mercado indica 30 a 60 minutos para preservar a audiência.
