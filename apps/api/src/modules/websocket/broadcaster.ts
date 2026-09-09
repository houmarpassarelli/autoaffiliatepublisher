// apps/api/src/modules/websocket/broadcaster.ts
import type { WebSocket } from 'ws';
import type { ServerEvent, ServerOutboundMessage } from '@aap/shared';
import { listConnections } from './connectionRegistry.js';

// Estado numérico de socket aberto definido pelo protocolo. Comparar com ele evita
// tentar escrever em conexões que já estão fechando.
const OPEN_STATE = 1;

/** Envia uma mensagem a um único socket. Silencioso se a conexão já morreu. */
export function sendToSocket(socket: WebSocket, message: ServerOutboundMessage): boolean {
  if (socket.readyState !== OPEN_STATE) {
    return false;
  }

  socket.send(JSON.stringify(message));

  return true;
}

/**
 * Envia um evento de estado a todos os sockets abertos.
 *
 * O broadcast é a camada de experiência do sistema — o card aparece ou some das
 * telas em milissegundos. Ele nunca é a camada de correção: a garantia contra
 * publicação duplicada é a escrita condicional no MongoDB.
 *
 * Retorna quantos sockets receberam a mensagem.
 */
export function broadcast(event: ServerEvent): number {
  let delivered = 0;

  for (const state of listConnections()) {
    if (sendToSocket(state.socket, event)) {
      delivered += 1;
    }
  }

  return delivered;
}
