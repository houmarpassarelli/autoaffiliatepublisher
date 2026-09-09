// apps/dashboard-remote/src/realtime/useRealtime.ts
import { useEffect, useRef, useState } from 'react';
import type { ServerEvent } from '@aap/shared';
import { RealtimeClient, type ConnectionStatus } from './realtimeClient.js';

export interface UseRealtimeResult {
  client: RealtimeClient;
  status: ConnectionStatus;
}

/**
 * Conexão de tempo real da tela, criada uma única vez e encerrada no desmonte.
 *
 * O cliente vive num `ref` e não no estado: trocar de instância a cada render
 * derrubaria e reabriria o socket, e cada reabertura custa uma nova
 * reivindicação de identidade ao servidor.
 */
export function useRealtime(): UseRealtimeResult {
  const clientRef = useRef<RealtimeClient | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  clientRef.current ??= new RealtimeClient();

  const client = clientRef.current;

  useEffect(() => {
    const unsubscribe = client.onStatus(setStatus);

    client.connect();

    return () => {
      unsubscribe();
      client.dispose();
    };
  }, [client]);

  return { client, status };
}

/**
 * Inscrição em eventos de broadcast.
 *
 * O ouvinte fica num `ref` para que a inscrição não seja refeita a cada render:
 * o efeito depende apenas do cliente, e sempre chama a versão mais recente do
 * tratador.
 */
export function useServerEvent(
  client: RealtimeClient,
  handler: (event: ServerEvent) => void,
): void {
  const handlerRef = useRef(handler);

  handlerRef.current = handler;

  useEffect(() => client.onEvent((event) => handlerRef.current(event)), [client]);
}
