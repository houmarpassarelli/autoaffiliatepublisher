// apps/api/src/modules/ingestion/affiliateLinkService.ts

/**
 * Converte a URL canônica de um produto na sua versão rastreada (link de afiliado).
 *
 * Como cada e-commerce ou plataforma de afiliação tem um formato próprio de
 * recebimento da tag (parâmetro de query diferente, domínio diferente, etc.),
 * este serviço isola essas regras heurísticas.
 *
 * @param canonicalUrl A URL limpa do produto (direto na loja).
 * @param affiliateTag A tag/ID cadastrada na fonte.
 * @returns A URL pronta para divulgação nos canais.
 */
export function convertCanonicalToAffiliateUrl(canonicalUrl: string, affiliateTag: string): string {
  try {
    const url = new URL(canonicalUrl);
    const hostname = url.hostname.toLowerCase();

    // 1. Amazon
    if (hostname.includes('amazon.com') || hostname.includes('amzn.to')) {
      // A Amazon usa primariamente o query param `tag=` para o associate ID.
      url.searchParams.set('tag', affiliateTag);
      return url.toString();
    }

    // 2. AliExpress
    if (hostname.includes('aliexpress.com')) {
      // AliExpress usa `aff_short_key` ou converte por portal.
      // Esta é uma parametrização direta comum.
      url.searchParams.set('aff_short_key', affiliateTag);
      return url.toString();
    }

    // 3. Shopee
    if (hostname.includes('shopee.com')) {
      // Shopee utiliza `aff_siteid` entre outros parâmetros, dependendo do programa local.
      url.searchParams.set('aff_siteid', affiliateTag);
      return url.toString();
    }
    
    // 4. Mercado Livre
    if (hostname.includes('mercadolivre.com') || hostname.includes('mercadolibre.com')) {
      // O programa de afiliados do Mercado Livre geralmente adiciona `af_id` ou algo similiar,
      // ou utiliza um redirecionador próprio. Simplificado para `seller_id` / tracking:
      url.searchParams.set('tracking_id', affiliateTag);
      return url.toString();
    }

    // Fallback: genérico (Adiciona affiliate_id no query parameter)
    url.searchParams.set('affiliate_id', affiliateTag);
    return url.toString();
  } catch {
    // Se a URL original for inválida, falhamos silenciosamente retornando a original,
    // ou lançamos o erro (mas em ingestão é melhor não estourar a pipeline inteira).
    return canonicalUrl;
  }
}
