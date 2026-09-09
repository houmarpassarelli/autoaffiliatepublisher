# Módulo WebSocket

Sincronização do estado global de ofertas entre todos os operadores conectados, mais o controle de presença ativa. Implementado sobre `@fastify/websocket`.

## Papel arquitetural

O WebSocket é a camada de **experiência**: o card aparece ou some das telas em milissegundos. A camada de **correção** contra publicação duplicada é a escrita condicional no MongoDB (`ESPECS_TECNICAS.md`, Seção 6) — a trava nunca pode depender do broadcast, que é assíncrono.

## Rota

`GET /ws` — conexão única de tempo real. O socket nasce **anônimo**: ainda representa alguém apenas na tela-portão. Mesmo assim já recebe os eventos de broadcast, porque a própria tela de seleção precisa reagir a operadores entrando e saindo.

## Arquivos

| Arquivo | Responsabilidade |
| :--- | :--- |
| `connectionRegistry.ts` | Registro em memória das conexões vivas e do vínculo socket ↔ operador. |
| `broadcaster.ts` | Envio de mensagem a um socket ou a todos os sockets abertos. |
| `broadcastEvents.ts` | Os seis emissores tipados de evento de estado. |
| `presenceService.ts` | Reivindicação, liberação e projeção da presença em banco. |
| `presenceReaper.ts` | Varredura periódica das conexões sem heartbeat. |
| `websocketRoutes.ts` | Rota `/ws`, ciclo de vida da conexão e tratamento das mensagens do cliente. |

## Eventos de broadcast

| Evento | Origem | Estado |
| :--- | :--- | :---: |
| `OPERATOR_CONNECTED` | Reivindicação aceita na tela-portão | **Ativo** |
| `OPERATOR_DISCONNECTED` | Socket encerrado, ou expirado pelo varredor | **Ativo** |
| `OFFER_CREATED` | Worker de ingestão | Emissor pronto |
| `OFFER_STATE_CHANGED` | Rota de disparo (`POST /api/offers/:id/dispatch`) | Emissor pronto |
| `OFFER_PUBLISHED` | Worker da fila BullMQ | Emissor pronto |
| `CHANNELS_UPDATED` | CRUD de canais no painel administrativo | Emissor pronto |

Os quatro marcados como "emissor pronto" têm função tipada disponível em `broadcastEvents.ts`, aguardando o módulo que os dispara. Nenhum gatilho foi simulado.

## Mensagens do cliente

| Mensagem | Resposta |
| :--- | :--- |
| `OPERATOR_CLAIM` | `OPERATOR_CLAIM_ACCEPTED`, ou `OPERATOR_CLAIM_REJECTED` com motivo `OPERATOR_IN_USE` (outro socket já representa o operador) ou `OPERATOR_UNAVAILABLE` (operador inexistente ou inativo). Resposta ponto a ponto, nunca broadcast. |
| `HEARTBEAT` | Sem resposta. Renova a janela de presença da conexão. |

Tudo que chega pelo socket é **entrada não confiável**: é validado contra o `clientMessageSchema` de `@aap/shared` antes de tocar o registro de presença. Mensagem malformada é descartada com log e **não** derruba a conexão — um cliente desatualizado não deve tirar o operador do ar.

## Presença ativa

A verdade sobre quem está online é o **socket vivo**, mantido no registro em memória. O campo `isOnline` em banco é a projeção dessa verdade, e existe para que a tela-portão possa ser carregada por HTTP antes de qualquer conexão.

Duas salvaguardas sustentam essa projeção:

- **Varredor de heartbeat** (`WEBSOCKET_HEARTBEAT_TIMEOUT_MS`, padrão 90s): conexões silenciosas por mais tempo que a janela são encerradas e têm a identidade liberada. Cobre a queda de rede que não produz `close` limpo.
- **Reset no bootstrap**: presenças remanescentes de uma execução anterior são zeradas antes que qualquer operador consiga se conectar. Cobre a morte abrupta do processo.

> **Contrato com o cliente:** o heartbeat deve começar **assim que o socket abre**, e não somente após a reivindicação de identidade. Conexões anônimas também são varridas quando ficam silenciosas.

## Nota de concorrência

A disputa pelo nome do operador é resolvida no registro em memória, não no banco. A verificação e a escrita acontecem no mesmo tick do event loop, o que as torna atômicas por construção num backend monothread e de processo único — a arquitetura homologada do projeto. Caso o backend venha a rodar em mais de um processo, esta trava precisa migrar para o Redis.
