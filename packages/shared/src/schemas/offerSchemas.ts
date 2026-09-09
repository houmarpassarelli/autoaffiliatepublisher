// packages/shared/src/schemas/offerSchemas.ts
import { z } from 'zod';
import { OfferStatus } from '../enums/index.js';
import { isoDateSchema, objectIdSchema } from './commonSchemas.js';

/**
 * Variantes de copy geradas pela IA a partir do payload estruturado da oferta.
 * Regra de fronteira: o LLM recebe apenas dados já extraídos e validados —
 * nunca HTML bruto, nunca instrução de navegação (ESPECS_TECNICAS.md, Seção 4).
 */
export const aiCopyVariantsSchema = z.object({
  messaging: z.string(), // WhatsApp e Telegram — copy curta, emojis, gatilho de urgência, link
  social: z.string(), // Instagram e TikTok — legenda com hashtags
  article: z.string(), // Site próprio — postagem estruturada e indexável para SEO
});

export type AiCopyVariants = z.infer<typeof aiCopyVariantsSchema>;

/**
 * Registro pontual de preço, usado para saber se o item está de fato no menor
 * preço do período recente (insumo da decisão editorial do operador).
 */
export const priceHistoryEntrySchema = z.object({
  price: z.number().nonnegative(),
  capturedAt: isoDateSchema,
});

export type PriceHistoryEntry = z.infer<typeof priceHistoryEntrySchema>;

/**
 * Oferta como o card do Dashboard Remoto a consome.
 * O histórico de preços completo não é enviado na listagem das abas — apenas
 * o menor preço registrado, suficiente para sinalizar o melhor momento de compra.
 */
export const offerDtoSchema = z.object({
  id: objectIdSchema,
  sourceId: objectIdSchema, // Fonte que originou a oferta
  sourceName: z.string(), // Loja de origem exibida no card
  externalSku: z.string(), // ID do produto na loja de origem
  title: z.string(), // Título original do produto
  affiliateUrl: z.url(), // URL convertida com a tag de afiliado
  imageUrl: z.url(), // Imagem do produto
  priceOriginal: z.number().nonnegative(), // Preço "de"
  priceCurrent: z.number().nonnegative(), // Preço "por"
  discountPct: z.number().min(0).max(100), // Desconto percentual calculado na ingestão
  lowestPriceSeen: z.number().nonnegative().nullable(), // Menor preço já registrado no histórico
  aiCopy: aiCopyVariantsSchema, // Copy por formato de canal
  status: z.enum(OfferStatus),
  operatorName: z.string().nullable(), // Autor da ação resolutiva, quando houver
  selectedChannels: z.array(z.string()), // Chaves dos canais escolhidos no disparo
  scheduledFor: isoDateSchema.nullable(), // Horário previsto de disparo (status SCHEDULED)
  createdAt: isoDateSchema, // Data de resgate — base da ordenação decrescente
  resolvedAt: isoDateSchema.nullable(), // Momento da ação resolutiva do operador
});

export type OfferDto = z.infer<typeof offerDtoSchema>;
