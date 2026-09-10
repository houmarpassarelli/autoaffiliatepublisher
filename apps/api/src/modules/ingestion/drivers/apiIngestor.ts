// apps/api/src/modules/ingestion/drivers/apiIngestor.ts
import axios from 'axios';
import type { IngestorDriver, RawOffer } from '../contracts.js';
import type { SourceDocument } from '../../../database/models/sourceModel.js';

export class ApiIngestor implements IngestorDriver {
  public async fetchOffers(source: SourceDocument): Promise<RawOffer[]> {
    try {
      // Montamos os headers baseados nas credenciais
      const headers: Record<string, string> = {};
      if (source.credentials && source.credentials.size > 0) {
        for (const [key, value] of source.credentials.entries()) {
          // Simplificação: injetamos todas as credenciais no header. 
          // Numa implementação real para cada API (ex: Shopee, Amazon),
          // o mapeamento precisaria ser específico ou haver uma camada de adapter.
          headers[key] = value;
        }
      }

      const response = await axios.get(source.url, { headers });
      
      // Aqui, cada API de afiliado tem um formato de resposta diferente. 
      // Por ser um ingestor "genérico" no plano, assumimos que a API retorna 
      // um array de objetos num campo "data" ou um mapeamento flexível.
      // Em uma integração em produção, cada loja precisaria do seu adapter.
      // Assumiremos uma resposta mapeada para o nosso DTO ou que devolve { items: [] }
      const items = response.data.items || response.data || [];
      
      const rawOffers: RawOffer[] = items.map((item: any) => ({
        externalSku: item.sku || item.id || String(Date.now()),
        title: item.title || item.name || 'Produto sem título',
        originalUrl: item.url || item.link || source.url,
        imageUrl: item.image || item.imageUrl || '',
        priceOriginal: Number(item.priceOriginal || item.oldPrice || item.priceCurrent) || 0,
        priceCurrent: Number(item.priceCurrent || item.price) || 0,
      }));

      return rawOffers;
    } catch (error) {
      console.error(`Falha ao buscar ofertas na API [${source.name}]:`, error);
      throw error;
    }
  }

  public async reverifyOffer(source: SourceDocument, externalSku: string, _originalUrl: string): Promise<RawOffer | null> {
    // Como a API genérica não sabemos se tem rota de detalhes,
    // buscamos tudo e filtramos.
    const offers = await this.fetchOffers(source);
    const offer = offers.find(o => o.externalSku === externalSku);
    return offer || null;
  }
}
