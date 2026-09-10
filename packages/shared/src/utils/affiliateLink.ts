// packages/shared/src/utils/affiliateLink.ts

/**
 * Injeta o identificador do operador na URL de afiliado como um parâmetro de rastreamento secundário (sub-ID).
 * Isso transforma a atribuição de comissão de "inferida por SKU" em "medida por clique rastreado".
 *
 * @param affiliateUrl A URL de afiliado base gerada na ingestão.
 * @param operatorId O ID do operador que está publicando a oferta.
 * @returns A URL com o sub-ID injetado.
 */
export function injectOperatorSubId(affiliateUrl: string, operatorId: string): string {
  try {
    const url = new URL(affiliateUrl);
    const hostname = url.hostname.toLowerCase();

    // 1. Shopee (Geralmente usa sub_id1, sub_id2...)
    if (hostname.includes('shopee.')) {
      url.searchParams.set('sub_id1', operatorId);
      return url.toString();
    }

    // 2. AliExpress / Awin (Costumam usar clickref, dp, sub_id, etc. Simplificado para subid)
    if (hostname.includes('aliexpress.com') || hostname.includes('awin1.com')) {
      url.searchParams.set('subid', operatorId);
      return url.toString();
    }

    // Fallback genérico:
    url.searchParams.set('subid', operatorId);
    return url.toString();
  } catch {
    // Se a URL for inválida, retorna como está.
    return affiliateUrl;
  }
}

/**
 * Substitui todas as ocorrências da URL base pela URL rastreada dentro de um texto (copy).
 *
 * @param copy O texto gerado pela IA contendo a URL.
 * @param baseUrl A URL base a ser substituída.
 * @param trackedUrl A URL rastreada com o sub-ID do operador.
 * @returns O texto com as URLs substituídas.
 */
export function replaceUrlInCopy(copy: string, baseUrl: string, trackedUrl: string): string {
  if (!copy || !baseUrl || !trackedUrl) return copy;
  // Faz escape simples para uso em regex
  const escapedBaseUrl = baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedBaseUrl, 'g');
  return copy.replace(regex, trackedUrl);
}
