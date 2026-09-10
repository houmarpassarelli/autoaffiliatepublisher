// apps/api/src/modules/ingestion/drivers/scraperIngestor.ts
import axios from 'axios';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright';
import type { IngestorDriver, RawOffer } from '../contracts.js';
import type { SourceDocument } from '../../../database/models/sourceModel.js';

export class ScraperIngestor implements IngestorDriver {
  /**
   * Decide heurísticamente ou por configuração qual motor usar.
   * Por padrão, vamos tentar scraping estático primeiro, e caso as ofertas 
   * sejam renderizadas em client-side (SPA), recorremos ao Playwright.
   */
  public async fetchOffers(source: SourceDocument): Promise<RawOffer[]> {
    try {
      // Como o source model não diferencia dinâmico de estático no tipo SCRAPER, 
      // podemos parametrizar via URL (ex: adicionando ?dynamic=1) ou assumir Playwright
      // para garantir a renderização de vitrines. Para fins de performance e demonstração,
      // usaremos o Playwright como default, já que lojas sem API costumam usar SPAs/React/Vue.
      
      const useDynamicRendering = source.url.includes('dynamic=true') || true;

      if (useDynamicRendering) {
        return await this.fetchDynamic(source);
      } else {
        return await this.fetchStatic(source);
      }
    } catch (error) {
      console.error(`Falha ao executar Scraper [${source.name}]:`, error);
      throw error;
    }
  }

  private async fetchDynamic(source: SourceDocument): Promise<RawOffer[]> {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(source.url, { waitUntil: 'networkidle' });
      
      // Obtemos o HTML completo já renderizado pelo browser
      const html = await page.content();
      
      // Delegamos a extração para o mesmo parser do Cheerio
      return this.parseHtml(html, source.url);
    } finally {
      await browser.close();
    }
  }

  private async fetchStatic(source: SourceDocument): Promise<RawOffer[]> {
    const response = await axios.get(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });
    return this.parseHtml(response.data, source.url);
  }

  /**
   * Extração de seletores genérica. Num cenário produtivo real, cada loja (Amazon, AliExpress)
   * necessitaria de um mapa de seletores específico (Strategy Pattern).
   */
  private parseHtml(html: string, baseUrl: string): RawOffer[] {
    const $ = cheerio.load(html);
    const rawOffers: RawOffer[] = [];
    
    // Seletores genéricos hipotéticos. Em ambiente real variam muito.
    const productCards = $('.product-card, .item-card, article');
    
    productCards.each((_, element) => {
      const title = $(element).find('h2, h3, .title').text().trim();
      let originalUrl = $(element).find('a').attr('href') || baseUrl;
      if (!originalUrl.startsWith('http')) {
        originalUrl = new URL(originalUrl, baseUrl).href;
      }
      
      const imageUrl = $(element).find('img').attr('src') || '';
      
      const priceStr = $(element).find('.price, .current-price').text();
      const oldPriceStr = $(element).find('.old-price, .original-price').text();
      
      const priceCurrent = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
      let priceOriginal = parseFloat(oldPriceStr.replace(/[^0-9.]/g, '')) || 0;
      if (priceOriginal === 0) priceOriginal = priceCurrent;

      const externalSku = $(element).attr('data-id') || $(element).attr('data-sku') || String(Date.now());

      if (title && priceCurrent > 0) {
        rawOffers.push({
          externalSku,
          title,
          originalUrl,
          imageUrl,
          priceOriginal,
          priceCurrent,
        });
      }
    });

    return rawOffers;
  }
}
