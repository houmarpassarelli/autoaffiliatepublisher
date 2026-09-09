// apps/dashboard-remote/src/state/useResyncOnReconnect.ts
import { useEffect, useRef } from 'react';
import type { ConnectionStatus } from '../realtime/realtimeClient.js';

/**
 * Recarrega os dados quando a conexão de tempo real volta de uma queda.
 *
 * Enquanto o socket está fora, o broadcast não chega: ofertas novas, decisões de
 * outros operadores e mudanças de canal acontecem sem que esta tela saiba. O
 * reflexo local fica defasado, e o estado global deixa de ser único — que é
 * justamente a garantia do projeto (FLUXO_OPERACIONAL.md, Seção 4.1).
 *
 * A primeira conexão não dispara recarga: a carga inicial já aconteceu por HTTP,
 * e refazê-la seria uma requisição a mais em toda abertura de tela.
 */
export function useResyncOnReconnect(status: ConnectionStatus, reload: () => void): void {
  const wasDisconnected = useRef(false);

  useEffect(() => {
    if (status === 'closed') {
      wasDisconnected.current = true;

      return;
    }

    if (status === 'open' && wasDisconnected.current) {
      wasDisconnected.current = false;
      reload();
    }
  }, [status, reload]);
}
