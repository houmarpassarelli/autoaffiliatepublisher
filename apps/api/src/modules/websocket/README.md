# Módulo WebSocket

Sincronização do estado global de ofertas entre todos os operadores conectados, mais o controle de presença. Implementação sobre `@fastify/websocket`, decisão fechada na sessão de estruturação.

## Papel arquitetural

O WebSocket é a camada de **experiência**: o card aparece ou some das telas em milissegundos. A camada de **correção** contra publicação duplicada é a escrita condicional no MongoDB (`ESPECS_TECNICAS.md`, Seção 6) — a trava nunca pode depender do broadcast, que é assíncrono.

## Escopo previsto (Sprint 2)

Eventos de broadcast do servidor: `OFFER_CREATED`, `OFFER_STATE_CHANGED`, `OFFER_PUBLISHED`, `OPERATOR_CONNECTED`, `OPERATOR_DISCONNECTED`, `CHANNELS_UPDATED`.

Mensagens do cliente: `OPERATOR_CLAIM` e `HEARTBEAT`.

Os contratos de tipagem desses eventos já estão definidos em `@aap/shared` (`contracts/websocketContracts.ts`) e são compartilhados com os dois dashboards.
