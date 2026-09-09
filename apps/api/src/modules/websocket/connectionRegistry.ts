// apps/api/src/modules/websocket/connectionRegistry.ts
import type { WebSocket } from 'ws';

/**
 * Estado de uma conexão viva.
 * `operatorId` só é preenchido depois de um OPERATOR_CLAIM aceito: um socket
 * recém-aberto ainda está na tela-portão e não representa ninguém.
 */
export interface ConnectionState {
  socket: WebSocket;
  operatorId: string | null;
  lastSeenAt: Date;
}

/**
 * Registro em memória das conexões e do vínculo socket ↔ operador.
 *
 * A reivindicação de identidade é decidida aqui, e não no banco, por dois motivos:
 * a presença é derivada do socket vivo — que só existe neste processo — e a
 * verificação seguida da escrita acontece no mesmo tick do event loop, o que a
 * torna atômica por construção num backend monothread e de processo único.
 */
const connections = new Map<WebSocket, ConnectionState>();

/** Registra uma conexão recém-aberta, ainda sem identidade reivindicada. */
export function registerConnection(socket: WebSocket): ConnectionState {
  const state: ConnectionState = { socket, operatorId: null, lastSeenAt: new Date() };

  connections.set(socket, state);

  return state;
}

/** Remove a conexão do registro e devolve o estado que ela tinha, se existia. */
export function unregisterConnection(socket: WebSocket): ConnectionState | null {
  const state = connections.get(socket);

  if (!state) {
    return null;
  }

  connections.delete(socket);

  return state;
}

/** Estado atual de uma conexão, se ela ainda estiver registrada. */
export function getConnectionState(socket: WebSocket): ConnectionState | null {
  return connections.get(socket) ?? null;
}

/** Indica se algum socket vivo já representa este operador. */
export function isOperatorClaimed(operatorId: string): boolean {
  for (const state of connections.values()) {
    if (state.operatorId === operatorId) {
      return true;
    }
  }

  return false;
}

/**
 * Vincula o socket ao operador, se ninguém o tiver reivindicado antes.
 * Retorna `false` quando o nome já está em uso — a origem do OPERATOR_IN_USE.
 */
export function claimOperator(socket: WebSocket, operatorId: string): boolean {
  const state = connections.get(socket);

  if (!state || isOperatorClaimed(operatorId)) {
    return false;
  }

  state.operatorId = operatorId;
  state.lastSeenAt = new Date();

  return true;
}

/** Atualiza o instante do último sinal de vida recebido daquele socket. */
export function touchConnection(socket: WebSocket): void {
  const state = connections.get(socket);

  if (state) {
    state.lastSeenAt = new Date();
  }
}

/** Todas as conexões vivas — base de qualquer broadcast. */
export function listConnections(): ConnectionState[] {
  return [...connections.values()];
}

/** Conexões silenciosas há mais tempo que a janela informada. */
export function listStaleConnections(timeoutMs: number): ConnectionState[] {
  const deadline = Date.now() - timeoutMs;

  return listConnections().filter((state) => state.lastSeenAt.getTime() < deadline);
}

/** Quantidade de conexões vivas — usada em log e diagnóstico. */
export function countConnections(): number {
  return connections.size;
}

/** Esvazia o registro. Reservado ao desligamento do processo. */
export function clearConnections(): void {
  connections.clear();
}
