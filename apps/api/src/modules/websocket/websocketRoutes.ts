// apps/api/src/modules/websocket/websocketRoutes.ts
import type { FastifyBaseLogger, FastifyPluginAsync } from 'fastify';
import type { WebSocket } from 'ws';
import { ClientMessageType, clientMessageSchema } from '@aap/shared';
import { countConnections, getConnectionState, registerConnection } from './connectionRegistry.js';
import { sendToSocket } from './broadcaster.js';
import { claimOperatorIdentity, registerHeartbeat, releaseConnection } from './presenceService.js';

/**
 * Interpreta uma mensagem recebida do cliente.
 *
 * Tudo que chega pelo socket é entrada não confiável: o texto é analisado e
 * validado contra o contrato compartilhado antes de tocar o registro de presença.
 * Mensagem malformada é descartada com log, nunca derruba a conexão — um cliente
 * desatualizado não deve tirar o operador do ar.
 */
async function handleClientMessage(
  socket: WebSocket,
  rawMessage: string,
  logger: FastifyBaseLogger,
): Promise<void> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawMessage);
  } catch {
    logger.warn('Mensagem WebSocket descartada: conteúdo não é JSON válido.');
    return;
  }

  const result = clientMessageSchema.safeParse(parsed);

  if (!result.success) {
    logger.warn({ issues: result.error.issues }, 'Mensagem WebSocket fora do contrato.');
    return;
  }

  const message = result.data;

  switch (message.type) {
    case ClientMessageType.OPERATOR_CLAIM: {
      const reply = await claimOperatorIdentity(socket, message.operatorId);

      sendToSocket(socket, reply);

      logger.info({ reply: reply.reply, operatorId: message.operatorId }, 'Reivindicação de identidade processada.');
      break;
    }

    case ClientMessageType.HEARTBEAT: {
      // O heartbeat não carrega identidade: ela vem do vínculo já estabelecido
      // no registro de conexões, e é nulo enquanto o socket segue na tela-portão.
      await registerHeartbeat(socket, getConnectionState(socket)?.operatorId ?? null);
      break;
    }
  }
}

/**
 * Rota única de tempo real. O socket nasce anônimo — representando alguém apenas
 * na tela-portão — mas já recebe os eventos de broadcast, porque a própria tela
 * de seleção precisa reagir a operadores entrando e saindo.
 */
export const websocketRoutes: FastifyPluginAsync = async (app) => {
  app.get('/ws', { websocket: true }, (socket, request) => {
    registerConnection(socket);

    request.log.info({ connections: countConnections() }, 'Conexão WebSocket aberta.');

    socket.on('message', (rawMessage: Buffer) => {
      void handleClientMessage(socket, rawMessage.toString(), request.log).catch(
        (error: unknown) => {
          request.log.error({ err: error }, 'Falha ao processar mensagem WebSocket.');
        },
      );
    });

    socket.on('close', () => {
      void releaseConnection(socket)
        .then((operatorId) => {
          request.log.info(
            { operatorId, connections: countConnections() },
            'Conexão WebSocket encerrada.',
          );
        })
        .catch((error: unknown) => {
          request.log.error({ err: error }, 'Falha ao liberar a presença na desconexão.');
        });
    });

    socket.on('error', (error: Error) => {
      request.log.error({ err: error }, 'Erro na conexão WebSocket.');
    });
  });
};
