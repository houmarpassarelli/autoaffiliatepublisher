// apps/api/src/modules/ingestion/contracts.ts
import type { SourceDocument } from '../../database/models/sourceModel.js';

/**
 * Representação bruta de uma oferta coletada, antes de
 * conversão de link, cálculo de desconto ou enriquecimento por IA.
 */
export interface RawOffer {
  externalSku: string;
  title: string;
  originalUrl: string;
  imageUrl: string;
  priceOriginal: number;
  priceCurrent: number;
}

/**
 * Interface base para qualquer motor de coleta de ofertas.
 */
export interface IngestorDriver {
  fetchOffers(source: SourceDocument): Promise<RawOffer[]>;
  reverifyOffer(source: SourceDocument, externalSku: string, originalUrl: string): Promise<RawOffer | null>;
}
