# Módulo de Ofertas

Carga das abas do Dashboard Remoto e **ações resolutivas** do operador sobre a oferta.

## As duas ações são o mesmo evento de domínio

"Publicar" e "Descartar" não são funcionalidades independentes: são duas saídas da decisão de um operador sobre uma oferta que ainda está em `OPEN`. Elas compartilham a porta de entrada, a transição atômica, a assinatura do operador e o broadcast — e por isso compartilham código aqui, em `offerResolutionService.ts`. Duplicar a trava de concorrência em duas rotas seria duplicar exatamente o trecho onde divergir sai mais caro.

| | **Publicar / Copiar** | **Descartar** |
| :--- | :--- | :--- |
| Estado de destino | `SCHEDULED` ou `COMPLETED`, conforme a fila | `DISCARDED`, terminal e imediato |
| Canais | Obrigatórios, mínimo 1, todos ativos | Nenhum |
| `DispatchLog` | Grava | **Não grava** — nada foi publicado |
| Efeito a jusante | Reserva lugar na fila de disparo | Bloqueia o produto na deduplicação da ingestão |

## Regras não-negociáveis

- **A trava de concorrência é a escrita condicional, nunca o broadcast.** `findOneAndUpdate({ _id, status: OPEN })` é a camada de correção; o broadcast é a camada de experiência. Quem perde a corrida recebe 409 (`ESPECS_TECNICAS.md`, Seção 6).
- **Validação antes da transição.** Operador inativo ou canal inexistente recusam o comando *sem* consumir a oferta, que precisa continuar disponível para outro operador.
- **O descarte não entra na auditoria.** `dispatch_logs` é insumo direto do comissionamento; registrar descarte ali contaminaria o rateio futuro.
- **`deliveryStatus` nasce vazio.** O resultado por canal pertence ao worker de disparo. Preenchê-lo aqui seria registrar como entregue algo que nenhum driver enviou.

## Pontos de extensão (Demanda 2.1 — fila BullMQ)

`dispatchScheduler.ts` isola os dois pontos que a fila vai assumir:

- `findDispatchHorizon()` — hoje lê o `scheduledFor` mais distante já reservado na coleção de ofertas; passa a ler o último job enfileirado no BullMQ.
- `calculateDispatchTime()` — a fórmula em si (`ESPECS_TECNICAS.md`, Seção 7) não muda; o Δ continua vindo de `DISPATCH_INTERVAL_MS`.

**Por que a oferta de disparo imediato também grava `scheduledFor`:** sem isso, dois cliques seguidos com a fila vazia produziriam dois disparos instantâneos — a rajada que a política anti-spam existe para impedir. O instante reservado precisa ficar registrado mesmo quando é "agora".

## Delimitação de escopo

Uma oferta em `COMPLETED` significa **ação resolutiva registrada**, não mensagem entregue no canal. Os drivers (`CHECKLIST.md`, Categoria 6) ainda não existem, e a confirmação de entrega é o evento `OFFER_PUBLISHED`, emitido pelo worker da fila.
