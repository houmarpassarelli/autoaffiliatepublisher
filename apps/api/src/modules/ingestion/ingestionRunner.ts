// apps/api/src/modules/ingestion/ingestionRunner.ts
import { OfferModel } from '../../database/models/offerModel.js';
import type { SourceDocument } from '../../database/models/sourceModel.js';
import { aiService } from '../ai/aiService.js';
import { broadcastOfferCreated } from '../websocket/index.js';
import { convertCanonicalToAffiliateUrl } from './affiliateLinkService.js';
import { filterNewOffers, generateDedupeHash } from './deduplicationService.js';
import { IngestorFactory } from './ingestorFactory.js';
import { enrichRawOffer, evaluateDeterministicFilter } from './offerUtils.js';
import { OfferStatus } from '@aap/shared';
import { toOfferDto } from '../offers/offerMapper.js';

export async function runIngestionForSource(source: SourceDocument): Promise<void> {
  // 1. Instanciar o Ingestor e buscar as ofertas (driver já trata a descriptografia se necessário)
  const ingestor = IngestorFactory.create(source.type);

  const rawOffers = await ingestor.fetchOffers(source);

  if (rawOffers.length === 0) {
    source.lastRunAt = new Date();
    await source.save();
    return;
  }

  // 2. Filtrar ofertas preexistentes (este método já grava o priceHistory na base para duplicatas)
  const newRawOffers = await filterNewOffers(rawOffers, source._id);

  if (newRawOffers.length === 0) {
    source.lastRunAt = new Date();
    await source.save();
    return;
  }

  const validOffersDocs: any[] = [];
  const invalidOffersDocs: any[] = [];

  for (const raw of newRawOffers) {
    const dedupeHash = generateDedupeHash(raw.originalUrl);
    const enriched = enrichRawOffer(raw, source._id, dedupeHash);

    // 3. Filtro determinístico
    const isValid = evaluateDeterministicFilter(raw, source);

    if (!isValid) {
      // Rejeitada: marca como DISCARDED para barrar em coletas futuras
      invalidOffersDocs.push({
        ...enriched,
        sourceName: source.name, // Will not be saved since it's not in schema but it's okay, mongoose drops it or we can just omit it
        affiliateUrl: '', // Sem gastar link pra lixo
        aiCopy: {}, // IA pulada
        status: OfferStatus.DISCARDED,
        operatorId: null,
        selectedChannels: [],
        scheduledFor: null,
        resolvedAt: null,
      });
      continue;
    }

    // 4. Integração LLM
    const affiliateUrl = convertCanonicalToAffiliateUrl(raw.originalUrl, source.affiliateTag);
    
    try {
      const aiCopy = await aiService.generateCopy({
        title: raw.title,
        priceOriginal: raw.priceOriginal,
        priceCurrent: raw.priceCurrent,
        discountPct: enriched.discountPct,
        sourceName: source.name,
        affiliateUrl,
      }, source.aiPromptTemplate);

      validOffersDocs.push({
        ...enriched,
        affiliateUrl,
        aiCopy,
        status: OfferStatus.OPEN,
        operatorId: null,
        selectedChannels: [],
        scheduledFor: null,
        resolvedAt: null,
      });
    } catch (error) {
      console.error(`Falha na ingestão da IA para oferta ${raw.title}:`, error);
    }
  }

  // 5. Persistência
  let insertedDocs: any[] = [];
  if (validOffersDocs.length > 0) {
    insertedDocs = await OfferModel.insertMany(validOffersDocs);
  }
  
  if (invalidOffersDocs.length > 0) {
    // Removendo sourceName para não poluir se tentar inserir
    const cleanedInvalid = invalidOffersDocs.map(({ sourceName, ...rest }) => rest);
    await OfferModel.insertMany(cleanedInvalid);
  }

  // 6. Atualizar a data da fonte
  source.lastRunAt = new Date();
  await source.save();

  // 7. Emitir broadcast via WebSocket (para a aba "Abertas")
  if (insertedDocs.length > 0) {
    const dtoOffers = insertedDocs.map(doc => toOfferDto(doc as any, source.name));
    broadcastOfferCreated(dtoOffers);
  }
}
