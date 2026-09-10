// apps/api/src/modules/websocket/index.ts
import fastifyWebsocket from '@fastify/websocket';
import type { FastifyInstance } from 'fastify';
import { env } from '../../config/env.js';
import { clearConnections, listConnections } from './connectionRegistry.js';
import { startPresenceReaper, stopPresenceReaper } from './presenceReaper.js';
import { websocketRoutes } from './websocketRoutes.js';

export * from './broadcastEvents.js';
export { resetPresence, revokeOperatorPresence } from './presenceService.js';

// A presença viva é consultada por outros módulos — a tela-portão precisa saber
// quais nomes já estão reivindicados antes de qualquer conexão daquele cliente.
export { isOperatorClaimed } from './connectionRegistry.js';

/**
 * Registra a camada de tempo real no Fastify: o plugin de WebSocket, a rota /ws
 * e o varredor de presenças órfãs.
 */
export async function registerWebsocketModule(app: FastifyInstance): Promise<void> {
  await app.register(fastifyWebsocket);
  await app.register(websocketRoutes);

  startPresenceReaper(env.WEBSOCKET_HEARTBEAT_TIMEOUT_MS, app.log);
}

/**
 * Encerra a camada de tempo real no desligamento gracioso.
 * Os sockets são fechados com código normal para que os clientes distingam uma
 * parada planejada de uma queda e possam reconectar sem alarde.
 */
export function shutdownWebsocketModule(): void {
  stopPresenceReaper();

  for (const state of listConnections()) {
    state.socket.close(1001, 'Servidor encerrando.');
  }

  clearConnections();
}
