// apps/api/src/modules/ingestion/offerUtils.ts
import { Types } from 'mongoose';
import type { RawOffer } from './contracts.js';

/**
 * Calcula o desconto percentual entre o preço original e o atual.
 * Retorna um inteiro entre 0 e 100.
 */
export function calculateDiscountPct(priceOriginal: number, priceCurrent: number): number {
  if (priceOriginal <= 0 || priceCurrent >= priceOriginal) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(((priceOriginal - priceCurrent) / priceOriginal) * 100)));
}

/**
 * Enriquece uma RawOffer gerando os campos necessários para a Offer (sem salvar ainda).
 * Adiciona o desconto e inicializa a série temporal (priceHistory) com a captura atual.
 */
export function enrichRawOffer(rawOffer: RawOffer, sourceId: Types.ObjectId, dedupeHash: string) {
  return {
    sourceId,
    externalSku: rawOffer.externalSku,
    dedupeHash,
    title: rawOffer.title,
    originalUrl: rawOffer.originalUrl,
    imageUrl: rawOffer.imageUrl,
    priceOriginal: rawOffer.priceOriginal,
    priceCurrent: rawOffer.priceCurrent,
    discountPct: calculateDiscountPct(rawOffer.priceOriginal, rawOffer.priceCurrent),
    priceHistory: [
      {
        price: rawOffer.priceCurrent,
        capturedAt: new Date(),
      },
    ],
  };
}
