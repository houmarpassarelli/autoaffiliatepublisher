// packages/shared/src/schemas/dispatchLogSchemas.ts
import { z } from 'zod';
import { DispatchActionType } from '../enums/index.js';
import { isoDateSchema, objectIdSchema } from './commonSchemas.js';

/**
 * Resultado da entrega por canal, no formato { chaveDoCanal: status }.
 * Preenchido pelo worker de disparo à medida que cada driver conclui.
 */
export const deliveryStatusSchema = z.record(z.string(), z.string());

export type DeliveryStatus = z.infer<typeof deliveryStatusSchema>;

/**
 * Linha do Painel de Auditoria. É a estrutura que viabiliza o comissionamento
 * futuro: carrega a assinatura do operador e o SKU de cruzamento com os
 * relatórios das plataformas de afiliados (MONETIZACAO.md).
 */
export const dispatchLogDtoSchema = z.object({
  id: objectIdSchema,
  offerId: objectIdSchema,
  operatorId: objectIdSchema,
  operatorName: z.string(), // Desnormalizado — preserva a autoria mesmo se o operador for removido
  offerTitle: z.string(), // Desnormalizado — evita join na listagem da auditoria
  sourceName: z.string(), // Loja de origem, usada como filtro do painel
  actionType: z.enum(DispatchActionType),
  channels: z.array(z.string()), // Chaves dos canais alvo
  productSku: z.string(), // Chave de cruzamento com os relatórios das plataformas
  affiliateUrl: z.url(),
  priceAtDispatch: z.number().nonnegative(), // Preço congelado no instante do disparo
  dispatchedAt: isoDateSchema,
  deliveryStatus: deliveryStatusSchema, // Resultado por canal (sucesso/erro)
});

export type DispatchLogDto = z.infer<typeof dispatchLogDtoSchema>;
