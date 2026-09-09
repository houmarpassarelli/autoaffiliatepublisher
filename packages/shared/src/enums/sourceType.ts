// packages/shared/src/enums/sourceType.ts

/**
 * Tipo de mecanismo de coleta utilizado pela fonte.
 * - API:     cliente de API oficial de afiliados (caminho preferencial)
 * - RSS:     leitor de feed RSS/XML/CSV das redes de afiliados
 * - SCRAPER: raspagem dirigida de páginas de oferta de lojas sem API aberta
 */
export enum SourceType {
  API = 'API',
  RSS = 'RSS',
  SCRAPER = 'SCRAPER',
}
