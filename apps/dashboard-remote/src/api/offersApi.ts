// apps/dashboard-remote/src/api/offersApi.ts
import {
  offerListResponseSchema,
  offerResolutionResponseSchema,
  offerDtoSchema,
  type DiscardCommand,
  type DispatchCommand,
  type OfferDto,
  type OfferResolutionResponse,
  type OfferStatus,
} from '@aap/shared';
import { apiRequest } from '@aap/ui';

/** Carga inicial de uma aba. A ordenação decrescente é garantida pelo servidor. */
export async function fetchOffersByStatus(status: OfferStatus): Promise<OfferDto[]> {
  const { offers } = await apiRequest(`/api/offers?status=${status}`, offerListResponseSchema);

  return offers;
}

/**
 * Clique em "Publicar": envia o comando e não faz mais nada.
 *
 * É a fronteira do Thin Client — o dashboard declara a intenção e a execução
 * inteira acontece na máquina administrativa. Nenhum token de canal chega até
 * aqui, e nenhum envio é montado neste processo (ARQUITETURA.md, Seção 6).
 */
export async function dispatchOffer(
  offerId: string,
  command: DispatchCommand,
): Promise<OfferResolutionResponse> {
  return apiRequest(`/api/offers/${offerId}/dispatch`, offerResolutionResponseSchema, {
    method: 'POST',
    body: JSON.stringify(command),
  });
}

/** Clique em "Descartar": estado terminal que alimenta o histórico anti-recaptura. */
export async function discardOffer(
  offerId: string,
  command: DiscardCommand,
): Promise<OfferResolutionResponse> {
  return apiRequest(`/api/offers/${offerId}/discard`, offerResolutionResponseSchema, {
    method: 'POST',
    body: JSON.stringify(command),
  });
}

/** Comando para regenerar a copy da oferta via IA (Demanda 1.4). */
export async function regenerateCopy(offerId: string): Promise<OfferDto> {
  return apiRequest(`/api/offers/${offerId}/regenerate`, offerDtoSchema, {
    method: 'POST',
  });
}
