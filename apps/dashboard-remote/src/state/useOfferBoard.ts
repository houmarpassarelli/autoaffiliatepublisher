// apps/dashboard-remote/src/state/useOfferBoard.ts
import { useCallback, useEffect, useState } from 'react';
import { OfferStatus, ServerEventType, type OfferDto, type ServerEvent } from '@aap/shared';
import { describeError } from '../api/httpClient.js';
import { fetchOffersByStatus } from '../api/offersApi.js';
import { useServerEvent } from '../realtime/useRealtime.js';
import type { ConnectionStatus, RealtimeClient } from '../realtime/realtimeClient.js';
import { useResyncOnReconnect } from './useResyncOnReconnect.js';

/** Os três estados que têm aba. `DISCARDED` sai da fila e não é exibido. */
export type OfferTabId = OfferStatus.OPEN | OfferStatus.SCHEDULED | OfferStatus.COMPLETED;

export const OFFER_TAB_IDS: OfferTabId[] = [
  OfferStatus.OPEN,
  OfferStatus.SCHEDULED,
  OfferStatus.COMPLETED,
];

export type OffersByTab = Record<OfferTabId, OfferDto[]>;

export type BoardPhase = 'loading' | 'ready' | 'error';

export interface OfferBoardState {
  phase: BoardPhase;
  offers: OffersByTab;
  error: string | null;
}

const EMPTY_BOARD: OffersByTab = {
  [OfferStatus.OPEN]: [],
  [OfferStatus.SCHEDULED]: [],
  [OfferStatus.COMPLETED]: [],
};

/** Indica se o estado tem aba própria — `DISCARDED` simplesmente desaparece da tela. */
function isTabStatus(status: OfferStatus): status is OfferTabId {
  return status !== OfferStatus.DISCARDED;
}

/**
 * Ordenação decrescente por data de resgate.
 *
 * Reaplicada a cada inserção porque a lista é viva: ofertas chegam pelo
 * broadcast a qualquer momento e precisam aparecer no topo, no mesmo lugar em
 * que a carga inicial as colocaria (FLUXO_OPERACIONAL.md, Seção 3.1).
 */
function sortByCreatedAtDesc(offers: OfferDto[]): OfferDto[] {
  return [...offers].sort(
    (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  );
}

/** Remove a oferta de todas as abas, onde quer que ela esteja. */
function removeEverywhere(offers: OffersByTab, offerId: string): OffersByTab {
  return {
    [OfferStatus.OPEN]: offers[OfferStatus.OPEN].filter((offer) => offer.id !== offerId),
    [OfferStatus.SCHEDULED]: offers[OfferStatus.SCHEDULED].filter((offer) => offer.id !== offerId),
    [OfferStatus.COMPLETED]: offers[OfferStatus.COMPLETED].filter((offer) => offer.id !== offerId),
  };
}

/** Localiza a oferta em qualquer aba. */
function findOffer(offers: OffersByTab, offerId: string): OfferDto | null {
  for (const tabId of OFFER_TAB_IDS) {
    const found = offers[tabId].find((offer) => offer.id === offerId);

    if (found) {
      return found;
    }
  }

  return null;
}

export interface OfferTransition {
  offerId: string;
  status: OfferStatus;
  operatorName: string;
  scheduledFor: string | null;
  selectedChannels?: string[];
}

/**
 * Migração de um card entre abas.
 *
 * A mesma função atende o broadcast e o retorno da própria ação do operador. Ela
 * é idempotente por construção — remove de todas as abas antes de inserir —, o
 * que importa porque quem dispara também recebe o próprio broadcast de volta.
 */
function applyTransition(offers: OffersByTab, transition: OfferTransition): OffersByTab {
  const current = findOffer(offers, transition.offerId);
  const cleaned = removeEverywhere(offers, transition.offerId);

  // Oferta que a tela nunca viu (carregada por outro operador em outra aba) ou
  // que saiu de cena: nada a reinserir.
  if (!current || !isTabStatus(transition.status)) {
    return cleaned;
  }

  const moved: OfferDto = {
    ...current,
    status: transition.status,
    operatorName: transition.operatorName,
    scheduledFor: transition.scheduledFor,
    selectedChannels: transition.selectedChannels ?? current.selectedChannels,
    resolvedAt: current.resolvedAt ?? new Date().toISOString(),
  };

  return {
    ...cleaned,
    [transition.status]: sortByCreatedAtDesc([...cleaned[transition.status], moved]),
  };
}

export interface UseOfferBoardResult extends OfferBoardState {
  /** Recarrega as três abas do servidor. */
  reload: () => void;
  /** Aplica localmente a transição que a própria tela acabou de provocar. */
  applyLocalTransition: (transition: OfferTransition) => void;
  /** Retira o card das abas sem conhecer o destino — usado quando a corrida é perdida. */
  dismissOffer: (offerId: string) => void;
}

/**
 * Estado das três abas do Dashboard Remoto.
 *
 * A fonte da verdade é o backend: a tela nunca decide sozinha o destino de uma
 * oferta. O que este hook mantém é o reflexo local desse estado global, montado
 * pela carga inicial via HTTP e atualizado pelos eventos de broadcast — nunca por
 * recarregamento de página (FLUXO_OPERACIONAL.md, Seções 4.1 e 4.3).
 *
 * O estado da conexão entra como dependência porque uma queda cria um buraco: os
 * eventos daquele intervalo não chegam, e o reflexo local precisa ser refeito
 * quando o socket volta.
 */
export function useOfferBoard(
  client: RealtimeClient,
  status: ConnectionStatus,
): UseOfferBoardResult {
  const [state, setState] = useState<OfferBoardState>({
    phase: 'loading',
    offers: EMPTY_BOARD,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => {
    setState((current) => ({ ...current, phase: 'loading', error: null }));
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    // Cancela a atualização de estado se a tela for desmontada antes da resposta.
    let active = true;

    async function loadAllTabs(): Promise<void> {
      try {
        const [open, scheduled, completed] = await Promise.all([
          fetchOffersByStatus(OfferStatus.OPEN),
          fetchOffersByStatus(OfferStatus.SCHEDULED),
          fetchOffersByStatus(OfferStatus.COMPLETED),
        ]);

        if (!active) {
          return;
        }

        setState({
          phase: 'ready',
          offers: {
            [OfferStatus.OPEN]: open,
            [OfferStatus.SCHEDULED]: scheduled,
            [OfferStatus.COMPLETED]: completed,
          },
          error: null,
        });
      } catch (error) {
        if (active) {
          setState({ phase: 'error', offers: EMPTY_BOARD, error: describeError(error) });
        }
      }
    }

    void loadAllTabs();

    return () => {
      active = false;
    };
  }, [attempt]);

  const applyLocalTransition = useCallback((transition: OfferTransition) => {
    setState((current) => ({ ...current, offers: applyTransition(current.offers, transition) }));
  }, []);

  useResyncOnReconnect(status, reload);

  const dismissOffer = useCallback((offerId: string) => {
    setState((current) => ({ ...current, offers: removeEverywhere(current.offers, offerId) }));
  }, []);

  useServerEvent(client, (event: ServerEvent) => {
    switch (event.event) {
      case ServerEventType.OFFER_CREATED: {
        // Ofertas novas entram no topo da aba Abertas, sem recarregar a página.
        setState((current) => {
          const known = new Set(current.offers[OfferStatus.OPEN].map((offer) => offer.id));
          const incoming = event.offers.filter((offer) => !known.has(offer.id));

          return {
            ...current,
            offers: {
              ...current.offers,
              [OfferStatus.OPEN]: sortByCreatedAtDesc([
                ...incoming,
                ...current.offers[OfferStatus.OPEN],
              ]),
            },
          };
        });
        break;
      }

      case ServerEventType.OFFER_STATE_CHANGED: {
        // Ação resolutiva de qualquer operador: o card sai de Abertas em todas as telas.
        setState((current) => ({
          ...current,
          offers: applyTransition(current.offers, {
            offerId: event.offerId,
            status: event.status,
            operatorName: event.operatorName,
            scheduledFor: event.scheduledFor,
          }),
        }));
        break;
      }

      case ServerEventType.OFFER_PUBLISHED: {
        // Job da fila concluído: o card migra de Agendadas para Concluídas.
        setState((current) => {
          const published = findOffer(current.offers, event.offerId);

          if (!published) {
            return current;
          }

          return {
            ...current,
            offers: applyTransition(current.offers, {
              offerId: event.offerId,
              status: OfferStatus.COMPLETED,
              operatorName: published.operatorName ?? '',
              scheduledFor: published.scheduledFor,
            }),
          };
        });
        break;
      }

      default:
        // Eventos de presença e de canais são tratados por quem cuida deles.
        break;
    }
  });

  return { ...state, reload, applyLocalTransition, dismissOffer };
}
