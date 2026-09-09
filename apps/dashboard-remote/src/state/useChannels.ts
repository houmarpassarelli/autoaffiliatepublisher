// apps/dashboard-remote/src/state/useChannels.ts
import { useCallback, useEffect, useState } from 'react';
import { ServerEventType, type ChannelDto } from '@aap/shared';
import { describeError } from '../api/httpClient.js';
import { fetchActiveChannels } from '../api/channelsApi.js';
import { useServerEvent } from '../realtime/useRealtime.js';
import type { ConnectionStatus, RealtimeClient } from '../realtime/realtimeClient.js';
import { useResyncOnReconnect } from './useResyncOnReconnect.js';

export interface UseChannelsResult {
  channels: ChannelDto[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Canais de destino disponíveis para o seletor multicanal.
 *
 * Carga inicial por HTTP e atualização por `CHANNELS_UPDATED`: qualquer canal
 * adicionado, editado ou desativado no painel administrativo reflete aqui de
 * imediato, sem que o operador precise recarregar a página
 * (FLUXO_OPERACIONAL.md, Seção 6).
 */
export function useChannels(client: RealtimeClient, status: ConnectionStatus): UseChannelsResult {
  const [channels, setChannels] = useState<ChannelDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadChannels(): Promise<void> {
      try {
        const loaded = await fetchActiveChannels();

        if (active) {
          setChannels(loaded);
          setError(null);
        }
      } catch (loadError) {
        if (active) {
          setError(describeError(loadError));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadChannels();

    return () => {
      active = false;
    };
  }, [attempt]);

  useResyncOnReconnect(status, reload);

  useServerEvent(client, (event) => {
    if (event.event === ServerEventType.CHANNELS_UPDATED) {
      // O painel administrativo emite a lista completa; canal inativo é omitido
      // do dashboard remoto por não ser destino elegível.
      setChannels(event.channels.filter((channel) => channel.active));
    }
  });

  return { channels, loading, error, reload };
}
