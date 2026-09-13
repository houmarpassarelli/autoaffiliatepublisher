import { createHash } from 'crypto';
import type { Types } from 'mongoose';
import { OfferModel } from '../../database/models/offerModel.js';
import type { RawOffer } from './contracts.js';

/**
 * Normaliza uma URL para evitar duplicatas causadas por parâmetros de rastreamento.
 * Remove os parâmetros de query conhecidos e ordena os restantes.
 * 
 * @param url URL original do produto na loja
 * @returns URL canônica para cálculo do hash
 */
export function canonicalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    
    // Remove a âncora (hash) da URL
    parsed.hash = '';
    
    // Parâmetros de rastreamento comuns que não alteram o produto
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 
      'ref', 'aff_id', 'click_id', 'smid', 'gclid', 'fbclid'
    ];
    
    for (const param of trackingParams) {
      parsed.searchParams.delete(param);
    }
    
    // Ordena os parâmetros restantes para garantir consistência
    parsed.searchParams.sort();
    
    // Remove barra invertida final do pathname, se houver
    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    
    return parsed.toString();
  } catch (error) {
    // Se a URL não for parseável, retorna a string original
    return url;
  }
}

/**
 * Gera um hash SHA-256 a partir da URL canônica da oferta.
 * 
 * @param url URL original do produto na loja
 * @returns Hash SHA-256 em formato hexadecimal
 */
export function generateDedupeHash(url: string): string {
  return createHash('sha256')
    .update(canonicalizeUrl(url))
    .digest('hex');
}

/**
 * Filtra um lote de ofertas coletadas, removendo aquelas que já existem
 * no banco de dados (seja por dedupeHash ou pela combinação externalSku + sourceId).
 * 
 * O status da oferta existente não importa (mesmo DISCARDED impede a recaptura).
 * 
 * @param rawOffers Lote de ofertas recém-coletadas
 * @param sourceId ID da fonte (loja/plataforma) de onde as ofertas vieram
 * @returns Array contendo apenas as ofertas inéditas
 */
export async function filterNewOffers(
  rawOffers: RawOffer[],
  sourceId: Types.ObjectId
): Promise<RawOffer[]> {
  if (rawOffers.length === 0) {
    return [];
  }

  // 1. Prepara as chaves de busca para a consulta em lote
  const dedupeHashes = rawOffers.map((offer) => generateDedupeHash(offer.originalUrl));
  const externalSkus = rawOffers.map((offer) => offer.externalSku);

  // 2. Consulta o banco em bloco, aproveitando os índices:
  // - { dedupeHash: 1 }
  // - { externalSku: 1, sourceId: 1 }
  const existingOffers = await OfferModel.find({
    $or: [
      { dedupeHash: { $in: dedupeHashes } },
      { sourceId, externalSku: { $in: externalSkus } }
    ]
  }, { dedupeHash: 1, externalSku: 1, _id: 1 }).lean();

  if (existingOffers.length === 0) {
    return rawOffers;
  }

  // 3. Registra o histórico de preço para as ofertas já existentes
  const bulkOps = [];
  const now = new Date();

  for (const existing of existingOffers) {
    // Encontra a oferta bruta correspondente para pegar o preço atual
    const matchedRaw = rawOffers.find(
      (ro) => ro.externalSku === existing.externalSku || generateDedupeHash(ro.originalUrl) === existing.dedupeHash
    );

    if (matchedRaw) {
      bulkOps.push({
        updateOne: {
          filter: { _id: existing._id },
          update: {
            $push: {
              priceHistory: {
                price: matchedRaw.priceCurrent,
                capturedAt: now,
              },
            },
          },
        },
      });
    }
  }

  if (bulkOps.length > 0) {
    await OfferModel.bulkWrite(bulkOps as any);
  }

  // 4. Constrói conjuntos (Sets) para busca O(1) na hora do filtro
  const existingHashes = new Set(existingOffers.map((offer) => offer.dedupeHash));
  const existingSkus = new Set(existingOffers.map((offer) => offer.externalSku));

  // 5. Filtra o lote original, mantendo apenas o que é inédito
  return rawOffers.filter((offer) => {
    const hash = generateDedupeHash(offer.originalUrl);
    
    const hashExists = existingHashes.has(hash);
    const skuExists = existingSkus.has(offer.externalSku);
    
    return !hashExists && !skuExists;
  });
}
