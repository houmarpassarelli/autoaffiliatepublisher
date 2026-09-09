// apps/api/src/modules/websocket/broadcastEvents.ts
import {
  ServerEventType,
  type ChannelDto,
  type DeliveryStatus,
  type OfferDto,
  type OfferStatus,
} from '@aap/shared';
import { broadcast } from './broadcaster.js';

/**
 * Emissores tipados dos eventos de estado global.
 *
 * Cada um pertence a um módulo que o dispara: a ingestão anuncia ofertas novas,
 * a rota de disparo anuncia a ação resolutiva do operador, o worker da fila
 * anuncia a publicação confirmada e o CRUD de canais anuncia mudanças de destino.
 * Concentrá-los aqui impede que esses módulos montem payloads à mão e divirjam
 * do contrato compartilhado com os dashboards.
 */

/** Ofertas novas entram no topo da aba Abertas de todos os clientes, sem recarregar a página. */
export function broadcastOfferCreated(offers: OfferDto[]): number {
  if (offers.length === 0) {
    return 0;
  }

  return broadcast({ event: ServerEventType.OFFER_CREATED, offers });
}

/** Ação resolutiva do operador: o card some da aba Abertas em todas as telas. */
export function broadcastOfferStateChanged(payload: {
  offerId: string;
  status: OfferStatus;
  operatorId: string;
  operatorName: string;
  scheduledFor: string | null;
}): number {
  return broadcast({ event: ServerEventType.OFFER_STATE_CHANGED, ...payload });
}

/** Job da fila concluído: o card migra de Agendadas para Concluídas. */
export function broadcastOfferPublished(offerId: string, deliveryStatus: DeliveryStatus): number {
  return broadcast({ event: ServerEventType.OFFER_PUBLISHED, offerId, deliveryStatus });
}

/** Operador entrou pela tela-portão: o nome é desabilitado nas demais telas de entrada. */
export function broadcastOperatorConnected(operatorId: string, name: string): number {
  return broadcast({ event: ServerEventType.OPERATOR_CONNECTED, operatorId, name });
}

/** Socket encerrado: o nome volta a ficar disponível instantaneamente. */
export function broadcastOperatorDisconnected(operatorId: string): number {
  return broadcast({ event: ServerEventType.OPERATOR_DISCONNECTED, operatorId });
}

/** CRUD de canais no painel administrativo: os checkboxes dos cards são atualizados. */
export function broadcastChannelsUpdated(channels: ChannelDto[]): number {
  return broadcast({ event: ServerEventType.CHANNELS_UPDATED, channels });
}
