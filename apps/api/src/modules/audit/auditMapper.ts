// apps/api/src/modules/audit/auditMapper.ts
import type { DispatchActionType, DeliveryStatus, DispatchLogDto } from '@aap/shared';
import type { Types } from 'mongoose';
import type { DispatchLogAttributes } from '../../database/models/index.js';

/**
 * Forma mínima consumida pelo mapeador.
 *
 * `deliveryStatus` aparece como `Map` no documento hidratado e como objeto
 * simples no `lean()` — as duas formas precisam ser aceitas, pela mesma razão
 * já registrada no mapeador de credenciais.
 */
export type MappableDispatchLog = Omit<DispatchLogAttributes, 'deliveryStatus'> & {
  _id: Types.ObjectId;
  deliveryStatus?: Map<string, string> | Record<string, string>;
};

/** Normaliza o resultado por canal para o objeto simples que o DTO declara. */
function toDeliveryStatus(deliveryStatus: MappableDispatchLog['deliveryStatus']): DeliveryStatus {
  if (!deliveryStatus) {
    return {};
  }

  return deliveryStatus instanceof Map ? Object.fromEntries(deliveryStatus) : { ...deliveryStatus };
}

/**
 * Converte a linha de auditoria persistida no DTO do Painel de Auditoria.
 *
 * Nenhum campo é resolvido por consulta: o log desnormaliza `operatorName`,
 * `offerTitle` e `sourceName` justamente para que a listagem não precise de
 * join — decisão do model, aproveitada aqui.
 */
export function toDispatchLogDto(log: MappableDispatchLog): DispatchLogDto {
  return {
    id: log._id.toString(),
    offerId: log.offerId.toString(),
    operatorId: log.operatorId.toString(),
    operatorName: log.operatorName,
    offerTitle: log.offerTitle,
    sourceName: log.sourceName,
    actionType: log.actionType as DispatchActionType,
    channels: log.channels,
    productSku: log.productSku,
    affiliateUrl: log.affiliateUrl,
    priceAtDispatch: log.priceAtDispatch,
    dispatchedAt: log.dispatchedAt.toISOString(),
    deliveryStatus: toDeliveryStatus(log.deliveryStatus),
  };
}
