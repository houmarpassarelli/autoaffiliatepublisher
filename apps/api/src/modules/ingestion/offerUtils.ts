// apps/api/src/modules/ingestion/offerUtils.ts
import type { Types } from 'mongoose';
import type { SourceDocument } from '../../database/models/sourceModel.js';
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

/**
 * Filtro determinístico pré-IA: avalia se uma RawOffer cumpre os requisitos
 * mínimos estabelecidos na Fonte para prosseguir no fluxo, evitando gasto de tokens.
 */
export function evaluateDeterministicFilter(rawOffer: RawOffer, source: SourceDocument): boolean {
  // 1. Filtro de preço mínimo
  if (source.preFilterMinPrice != null && rawOffer.priceCurrent < source.preFilterMinPrice) {
    return false;
  }

  // 2. Filtro de preço máximo
  if (source.preFilterMaxPrice != null && rawOffer.priceCurrent > source.preFilterMaxPrice) {
    return false;
  }

  // 3. Filtro de desconto percentual mínimo
  if (source.preFilterMinDiscount != null) {
    const discount = calculateDiscountPct(rawOffer.priceOriginal, rawOffer.priceCurrent);
    if (discount < source.preFilterMinDiscount) {
      return false;
    }
  }

  // 4. Filtro de categorias
  if (rawOffer.category) {
    // Se a fonte bloqueia esta categoria
    if (source.preFilterBlockedCategories && source.preFilterBlockedCategories.length > 0) {
      if (source.preFilterBlockedCategories.includes(rawOffer.category)) {
        return false;
      }
    }

    // Se a fonte tem uma lista estrita de categorias permitidas
    if (source.preFilterAllowedCategories && source.preFilterAllowedCategories.length > 0) {
      if (!source.preFilterAllowedCategories.includes(rawOffer.category)) {
        return false;
      }
    }
  } else {
    // Se a oferta não tem categoria, mas a fonte EXIGE estar numa categoria permitida,
    // devemos rejeitar (política conservadora para evitar ofertas cegas).
    if (source.preFilterAllowedCategories && source.preFilterAllowedCategories.length > 0) {
      return false;
    }
  }

  return true;
}
