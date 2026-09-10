// apps/api/src/modules/ingestion/ingestorFactory.ts
import { SourceType } from '@aap/shared';
import type { IngestorDriver } from './contracts.js';
import { ApiIngestor } from './drivers/apiIngestor.js';
import { RssIngestor } from './drivers/rssIngestor.js';
import { ScraperIngestor } from './drivers/scraperIngestor.js';

export class IngestorFactory {
  /**
   * Instancia e devolve o IngestorDriver correspondente ao SourceType.
   */
  public static create(type: SourceType): IngestorDriver {
    switch (type) {
      case SourceType.API:
        return new ApiIngestor();
      case SourceType.RSS:
        return new RssIngestor();
      case SourceType.SCRAPER:
        return new ScraperIngestor();
      default:
        throw new Error(`Tipo de fonte não suportado: ${type}`);
    }
  }
}
