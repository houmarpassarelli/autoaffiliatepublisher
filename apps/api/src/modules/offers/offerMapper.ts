// apps/api/src/modules/offers/offerMapper.ts
import { CopyFormat, type AiCopyVariants, type OfferDto } from '@aap/shared';
import type { Types } from 'mongoose';
import type { OfferAttributes, PriceHistoryEntryAttributes } from '../../database/models/index.js';

/** Forma mínima que o mapeador consome — serve tanto ao documento hidratado quanto ao `lean()`. */
export type MappableOffer = OfferAttributes & { _id: Types.ObjectId };

/**
 * Normaliza o campo `aiCopy` para as três variantes do contrato.
 *
 * O model declara `aiCopy` como Map: consultas hidratadas devolvem um Map real e
 * consultas com `lean()` devolvem um objeto simples. O mapeador aceita os dois e
 * completa com texto vazio a variante que a IA ainda não produziu — um card sem
 * uma das copies deve renderizar, não quebrar a listagem inteira da aba.
 */
function toAiCopyVariants(aiCopy: OfferAttributes['aiCopy']): AiCopyVariants {
  const entries: Record<string, string> =
    aiCopy instanceof Map ? Object.fromEntries(aiCopy as Map<string, string>) : (aiCopy ?? {});

  return {
    messaging: entries[CopyFormat.MESSAGING] ?? '',
    social: entries[CopyFormat.SOCIAL] ?? '',
    article: entries[CopyFormat.ARTICLE] ?? '',
  };
}

/**
 * Menor preço já registrado para o item.
 *
 * O histórico completo não trafega para o card: o que interessa ao operador na
 * hora de decidir é uma única informação — se o preço de agora é ou não o melhor
 * já visto (FLUXO_OPERACIONAL.md, Seção 9.3).
 */
function findLowestPriceSeen(priceHistory: PriceHistoryEntryAttributes[]): number | null {
  if (priceHistory.length === 0) {
    return null;
  }

  return priceHistory.reduce(
    (lowest, entry) => Math.min(lowest, entry.price),
    Number.POSITIVE_INFINITY,
  );
}

/**
 * Converte a oferta persistida no DTO consumido pelos dashboards.
 *
 * O nome da loja é recebido pronto, e não buscado aqui: mapear item a item
 * produziria uma consulta por card. Quem chama resolve as fontes em bloco.
 */
export function toOfferDto(offer: MappableOffer, sourceName: string): OfferDto {
  return {
    id: offer._id.toString(),
    sourceId: offer.sourceId.toString(),
    sourceName,
    externalSku: offer.externalSku,
    title: offer.title,
    affiliateUrl: offer.affiliateUrl,
    imageUrl: offer.imageUrl,
    priceOriginal: offer.priceOriginal,
    priceCurrent: offer.priceCurrent,
    discountPct: offer.discountPct,
    lowestPriceSeen: findLowestPriceSeen(offer.priceHistory),
    aiCopy: toAiCopyVariants(offer.aiCopy),
    status: offer.status,
    operatorName: null, // Preenchido por quem tiver o operador em mãos (ver `withOperatorName`).
    selectedChannels: offer.selectedChannels,
    scheduledFor: offer.scheduledFor?.toISOString() ?? null,
    createdAt: offer.createdAt.toISOString(),
    resolvedAt: offer.resolvedAt?.toISOString() ?? null,
  };
}

/** Acrescenta a assinatura do operador ao DTO já montado. */
export function withOperatorName(offer: OfferDto, operatorName: string | null): OfferDto {
  return { ...offer, operatorName };
}
