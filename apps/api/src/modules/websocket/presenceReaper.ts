// apps/api/src/modules/websocket/presenceReaper.ts
import type { FastifyBaseLogger } from 'fastify';
import { listStaleConnections } from './connectionRegistry.js';
import { releaseConnection } from './presenceService.js';

/**
 * Reconciliação de presença órfã.
 *
 * A presença é derivada do socket vivo, mas nem toda queda de conexão produz um
 * evento `close`: uma rede que some, um celular que dorme ou um processo cliente
 * morto deixam o socket aberto do lado do servidor. Sem este varredor, o nome do
 * operador ficaria travado como "Em uso" indefinidamente
 * (ESPECS_TECNICAS.md, Seção 3.2).
 *
 * A janela é medida contra o último HEARTBEAT recebido; o intervalo de varredura
 * é um terço dela, para que nenhuma conexão morta sobreviva muito além do limite.
 */
const SWEEP_DIVISOR = 3;

let sweepTimer: NodeJS.Timeout | null = null;

/** Derruba as conexões silenciosas e libera as identidades que elas seguravam. */
export async function sweepStaleConnections(
  timeoutMs: number,
  logger: FastifyBaseLogger,
): Promise<number> {
  const stale = listStaleConnections(timeoutMs);

  for (const state of stale) {
    logger.warn(
      { operatorId: state.operatorId, lastSeenAt: state.lastSeenAt },
      'Conexão sem heartbeat dentro da janela. Encerrando e liberando a presença.',
    );

    // A ordem importa: liberar antes de terminar garante que o broadcast de
    // desconexão saia mesmo que o encerramento do socket falhe.
    await releaseConnection(state.socket);
    state.socket.terminate();
  }

  return stale.length;
}

/** Inicia a varredura periódica. Idempotente: chamadas repetidas não duplicam o timer. */
export function startPresenceReaper(timeoutMs: number, logger: FastifyBaseLogger): void {
  if (sweepTimer) {
    return;
  }

  const intervalMs = Math.max(1_000, Math.floor(timeoutMs / SWEEP_DIVISOR));

  sweepTimer = setInterval(() => {
    void sweepStaleConnections(timeoutMs, logger).catch((error: unknown) => {
      logger.error({ err: error }, 'Falha na varredura de presenças órfãs.');
    });
  }, intervalMs);

  // O varredor não deve segurar o processo vivo no desligamento.
  sweepTimer.unref();
}

/** Encerra a varredura periódica no desligamento gracioso. */
export function stopPresenceReaper(): void {
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }
}
