// packages/shared/src/enums/copyFormat.ts

/**
 * Variantes de copy produzidas pelo módulo de IA numa única chamada ao LLM.
 * O campo `copyFormatKey` do canal aponta para uma destas chaves, definindo
 * qual texto o driver daquele canal consome no disparo.
 */
export enum CopyFormat {
  MESSAGING = 'messaging', // WhatsApp e Telegram — copy curta, emojis, gatilho de urgência, link
  SOCIAL = 'social', // Instagram e TikTok — legenda com hashtags (link não é clicável no IG)
  ARTICLE = 'article', // Site próprio — postagem estruturada e indexável para SEO
}
