// apps/api/src/modules/websocket/presenceService.ts
import type { WebSocket } from 'ws';
import {
  OPERATOR_IN_USE,
  OPERATOR_UNAVAILABLE,
  ServerReplyType,
  type ServerReply,
} from '@aap/shared';
import { OperatorModel } from '../../database/models/index.js';
import {
  claimOperator,
  listConnections,
  touchConnection,
  unregisterConnection,
} from './connectionRegistry.js';
import { broadcastOperatorConnected, broadcastOperatorDisconnected } from './broadcastEvents.js';

/**
 * Presença ativa dos operadores.
 *
 * A verdade sobre quem está online é o socket vivo, mantido no registro em
 * memória. O campo `isOnline` em banco é a projeção dessa verdade — existe para
 * que a tela-portão possa ser carregada por HTTP, antes de qualquer conexão.
 */

/**
 * Reivindicação de identidade na tela-portão.
 *
 * A ordem das verificações importa: primeiro o cadastro (existe e está ativo),
 * depois a disputa pelo nome. Assim um operador removido do sistema não bloqueia
 * o próprio nome ao tentar entrar.
 */
export async function claimOperatorIdentity(
  socket: WebSocket,
  operatorId: string,
): Promise<ServerReply> {
  const operator = await OperatorModel.findOne({ _id: operatorId, active: true });

  if (!operator) {
    return {
      reply: ServerReplyType.OPERATOR_CLAIM_REJECTED,
      operatorId,
      reason: OPERATOR_UNAVAILABLE,
    };
  }

  // Vínculo em memória: se outro socket chegou primeiro, a reivindicação é recusada.
  if (!claimOperator(socket, operatorId)) {
    return {
      reply: ServerReplyType.OPERATOR_CLAIM_REJECTED,
      operatorId,
      reason: OPERATOR_IN_USE,
    };
  }

  operator.isOnline = true;
  operator.lastSeenAt = new Date();
  await operator.save();

  // Só agora os demais operadores precisam desabilitar este nome nas suas telas.
  broadcastOperatorConnected(operatorId, operator.name);

  return {
    reply: ServerReplyType.OPERATOR_CLAIM_ACCEPTED,
    operatorId,
    name: operator.name,
  };
}

/**
 * Encerramento de uma conexão. Só há o que liberar se o socket chegou a
 * reivindicar uma identidade — sockets que ficaram na tela-portão saem em silêncio.
 */
export async function releaseConnection(socket: WebSocket): Promise<string | null> {
  const state = unregisterConnection(socket);

  if (!state?.operatorId) {
    return null;
  }

  const { operatorId } = state;

  await OperatorModel.updateOne({ _id: operatorId }, { $set: { isOnline: false } });

  broadcastOperatorDisconnected(operatorId);

  return operatorId;
}

/** Sinal de vida do cliente: mantém a conexão fora do alcance do varredor. */
export async function registerHeartbeat(socket: WebSocket, operatorId: string | null): Promise<void> {
  touchConnection(socket);

  if (operatorId) {
    await OperatorModel.updateOne({ _id: operatorId }, { $set: { lastSeenAt: new Date() } });
  }
}

/**
 * Zera as presenças remanescentes de uma execução anterior do processo.
 *
 * Necessário porque `isOnline` é projeção de um socket que morreu junto com o
 * processo: sem isto, uma queda abrupta deixaria operadores travados como
 * "Em uso" para sempre, sem ninguém conectado para liberá-los.
 */
export async function resetPresence(): Promise<number> {
  const result = await OperatorModel.updateMany(
    { isOnline: true },
    { $set: { isOnline: false } },
  );

  return result.modifiedCount;
}

/**
 * Revoga a presença de um operador desativado ou excluído no painel administrativo.
 *
 * Sem isto, a tela dele continuaria aberta e funcional na aparência, enquanto
 * `requireActiveOperator` recusaria cada clique — o operador veria o quadro,
 * decidiria sobre uma oferta e receberia um erro que não explica nada.
 *
 * A liberação vem antes do fechamento, na mesma ordem já adotada pelo varredor
 * de presenças órfãs: o broadcast de desconexão precisa sair mesmo que o
 * encerramento do socket falhe, ou o nome ficaria travado como "Em uso" nas
 * telas dos demais operadores.
 *
 * Nenhum evento novo é criado. O cliente já sabe tratar a perda da identidade —
 * ele volta à tela-portão na reconexão, que é exatamente o desfecho correto
 * para quem deixou de estar habilitado.
 */
export async function revokeOperatorPresence(operatorId: string): Promise<boolean> {
  const claimed = listConnections().find((state) => state.operatorId === operatorId);

  if (!claimed) {
    return false;
  }

  await releaseConnection(claimed.socket);
  claimed.socket.close(1000, 'Cadastro de operador alterado.');

  return true;
}
