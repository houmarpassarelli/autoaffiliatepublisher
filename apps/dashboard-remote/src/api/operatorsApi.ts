// apps/dashboard-remote/src/api/operatorsApi.ts
import { availableOperatorListResponseSchema, type AvailableOperatorDto } from '@aap/shared';
import { apiRequest } from '@aap/ui';

/**
 * Lista da tela-portão. Nomes já reivindicados chegam com `inUse: true` e são
 * renderizados desabilitados — a partir daí, a marcação é mantida em tempo real
 * pelos eventos de presença do WebSocket.
 */
export async function fetchAvailableOperators(): Promise<AvailableOperatorDto[]> {
  const { operators } = await apiRequest(
    '/api/operators/available',
    availableOperatorListResponseSchema,
  );

  return operators;
}
