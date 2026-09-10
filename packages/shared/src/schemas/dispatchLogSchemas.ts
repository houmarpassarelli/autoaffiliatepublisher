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

/**
 * Recorte de um dia do calendário, como o campo de data do formulário o envia.
 *
 * Trafega `YYYY-MM-DD` em vez de instante ISO porque é isso que o administrador
 * escolhe: um dia inteiro, não um momento. A conversão em início e fim do dia
 * acontece no servidor, no fuso da máquina administrativa — ver a nota no
 * serviço de consulta.
 */
export const calendarDaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data no formato AAAA-MM-DD.');

/**
 * Filtros do Painel de Auditoria (FLUXO_OPERACIONAL.md, Seção 8).
 *
 * Os quatro filtros não são do mesmo tipo, e a diferença importa:
 * - `operatorId` e `channel` apontam para cadastros vivos, que alimentam as
 *   listas de opções da tela;
 * - `sourceName` é **texto congelado** no instante do disparo. O log não guarda
 *   `sourceId`, porque a auditoria é imutável e o nome gravado é a verdade
 *   daquele momento;
 * - `from` e `to` recortam dias do calendário, não instantes.
 */
export const dispatchLogListQuerySchema = z.object({
  from: calendarDaySchema.optional(), // Primeiro dia do recorte, inclusive
  to: calendarDaySchema.optional(), // Último dia do recorte, inclusive
  operatorId: objectIdSchema.optional(), // Quem assinou a ação
  sourceName: z.string().min(1).optional(), // Loja de origem, como gravada no log
  channel: z.string().min(1).optional(), // Chave do canal de destino
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export type DispatchLogListQuery = z.infer<typeof dispatchLogListQuerySchema>;

/**
 * Totais do recorte filtrado.
 *
 * `totalValue` é a soma dos **preços dos produtos** congelados no disparo, e não
 * comissão: o cálculo de comissão é projeto futuro e depende do cruzamento com
 * os relatórios das plataformas (MONETIZACAO.md, Seção 3). A distinção está
 * declarada aqui para que a tela não a perca.
 */
export const dispatchLogTotalsSchema = z.object({
  totalDispatches: z.number().int().nonnegative(),
  totalValue: z.number().nonnegative(),
});

export type DispatchLogTotals = z.infer<typeof dispatchLogTotalsSchema>;

/**
 * Página de resultados da auditoria.
 *
 * `dispatch_logs` é a única coleção do sistema que cresce para sempre e nunca é
 * podada — daí a paginação, ausente nas demais telas do painel.
 */
export const dispatchLogListResponseSchema = z.object({
  logs: z.array(dispatchLogDtoSchema),
  totals: dispatchLogTotalsSchema,
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
});

export type DispatchLogListResponse = z.infer<typeof dispatchLogListResponseSchema>;

/**
 * Opções do filtro de loja de origem.
 *
 * Montadas a partir dos valores distintos gravados na própria coleção, e não do
 * cadastro de fontes: só assim toda opção oferecida corresponde a algum log.
 * Decorre daí que renomear uma fonte divide o filtro em duas entradas — os logs
 * antigos permanecem sob o nome antigo, que é o comportamento correto de uma
 * trilha de auditoria imutável.
 */
export const auditFilterOptionsResponseSchema = z.object({
  sourceNames: z.array(z.string()),
});

export type AuditFilterOptionsResponse = z.infer<typeof auditFilterOptionsResponseSchema>;
