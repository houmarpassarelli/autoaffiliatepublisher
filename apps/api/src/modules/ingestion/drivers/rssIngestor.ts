// apps/api/src/modules/ingestion/drivers/rssIngestor.ts
import axios from 'axios';
import * as cheerio from 'cheerio';
import type { IngestorDriver, RawOffer } from '../contracts.js';
import type { SourceDocument } from '../../../database/models/sourceModel.js';

export class RssIngestor implements IngestorDriver {
  public async fetchOffers(source: SourceDocument): Promise<RawOffer[]> {
    try {
      const response = await axios.get(source.url);
      const xml = response.data;
      
      // Utilizamos cheerio configurado para modo XML
      const $ = cheerio.load(xml, { xmlMode: true });
      
      const rawOffers: RawOffer[] = [];
      
      // Em feeds XML de afiliados (Awin, Lomadee), os produtos costumam vir em tags como <item> ou <entry>
      const items = $('item').length > 0 ? $('item') : $('entry');
      
      items.each((_, element) => {
        const title = $(element).find('title').text();
        const originalUrl = $(element).find('link').text();
        
        // Muitos feeds colocam a imagem em <g:image_link>, <enclosure> ou similar
        let imageUrl = $(element).find('g\\:image_link').text() || $(element).find('image_link').text();
        if (!imageUrl) {
          const enclosure = $(element).find('enclosure').attr('url');
          if (enclosure) imageUrl = enclosure;
        }

        const priceStr = $(element).find('g\\:price').text() || $(element).find('price').text();
        const salePriceStr = $(element).find('g\\:sale_price').text() || $(element).find('sale_price').text();
        
        const priceOriginal = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
        let priceCurrent = parseFloat(salePriceStr.replace(/[^0-9.]/g, ''));
        if (isNaN(priceCurrent) || priceCurrent === 0) {
          priceCurrent = priceOriginal;
        }

        const externalSku = $(element).find('g\\:id').text() || $(element).find('guid').text() || $(element).find('id').text();

        rawOffers.push({
          externalSku: externalSku || String(Date.now()), // Fallback caso não encontre ID
          title,
          originalUrl,
          imageUrl,
          priceOriginal,
          priceCurrent,
        });
      });

      return rawOffers;
    } catch (error) {
      console.error(`Falha ao ler feed RSS/XML [${source.name}]:`, error);
      throw error;
    }
  }
}
