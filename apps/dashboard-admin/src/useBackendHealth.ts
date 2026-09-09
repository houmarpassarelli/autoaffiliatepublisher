// apps/dashboard-admin/src/useBackendHealth.ts
import { useEffect, useState } from 'react';
import { healthResponseSchema, type HealthResponse } from '@aap/shared';

export type BackendHealthState =
  | { phase: 'loading' }
  | { phase: 'online'; health: HealthResponse }
  | { phase: 'offline'; reason: string };

/**
 * Consulta o estado da máquina administrativa na montagem da tela.
 * A resposta é validada pelo mesmo schema que o backend usa para serializá-la,
 * garantindo que uma divergência de contrato apareça aqui e não em produção.
 */
export function useBackendHealth(): BackendHealthState {
  const [state, setState] = useState<BackendHealthState>({ phase: 'loading' });

  useEffect(() => {
    // Cancela a atualização de estado se a tela for desmontada antes da resposta.
    const controller = new AbortController();

    async function fetchHealth(): Promise<void> {
      try {
        const response = await fetch('/health', { signal: controller.signal });
        const health = healthResponseSchema.parse(await response.json());

        setState({ phase: 'online', health });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          phase: 'offline',
          reason: error instanceof Error ? error.message : 'Falha desconhecida.',
        });
      }
    }

    void fetchHealth();

    return () => controller.abort();
  }, []);

  return state;
}
