// packages/shared/src/contracts/dispatchCommand.ts
import { z } from 'zod';
import { DispatchActionType, OfferStatus } from '../enums/index.js';
import { isoDateSchema, objectIdSchema } from '../schemas/commonSchemas.js';

/**
 * Comando enviado pelo Dashboard Remoto ao clicar em "Publicar" ou em
 * "Copiar para Área de Transferência". O cliente é Thin Client: ele apenas
 * declara a intenção — quem executa o envio é a máquina administrativa
 * (ESPECS_TECNICAS.md, Seção 5).
 */
export const dispatchCommandSchema = z.object({
  operatorId: objectIdSchema, // Assinatura da autoria, base do comissionamento
  actionType: z.enum(DispatchActionType), // Disparo automatizado ou publicação assistida
  channels: z.array(z.string()).min(1, 'Selecione ao menos um canal de destino.'),
});

export type DispatchCommand = z.infer<typeof dispatchCommandSchema>;

/**
 * Comando de descarte da oferta. Move o item para DISCARDED, que funciona como
 * lista de bloqueio permanente do produto na deduplicação da ingestão.
 */
export const discardCommandSchema = z.object({
  operatorId: objectIdSchema,
});

export type DiscardCommand = z.infer<typeof discardCommandSchema>;

/**
 * Identificação da oferta alvo na URL das rotas de ação resolutiva.
 * O `offerId` do payload documentado na Seção 5 do ESPECS_TECNICAS.md viaja
 * como parâmetro de rota: ele identifica o recurso, não o comando.
 */
export const offerIdParamsSchema = z.object({
  id: objectIdSchema,
});

export type OfferIdParams = z.infer<typeof offerIdParamsSchema>;

/**
 * Retorno das duas ações resolutivas — "Publicar"/"Copiar" e "Descartar".
 *
 * O cliente não precisa desta resposta para atualizar a própria tela: o
 * broadcast OFFER_STATE_CHANGED já faz isso em todas as telas conectadas,
 * inclusive na dele. Ela existe para que quem disparou saiba o desfecho exato
 * da sua ação — em especial se a oferta foi disparada de imediato ou entrou na
 * fila com horário marcado — sem depender da ordem de chegada do broadcast.
 */
export const offerResolutionResponseSchema = z.object({
  offerId: objectIdSchema,
  status: z.enum(OfferStatus), // COMPLETED, SCHEDULED ou DISCARDED
  operatorName: z.string(), // Assinatura registrada na ação
  selectedChannels: z.array(z.string()), // Vazio no descarte
  scheduledFor: isoDateSchema.nullable(), // Instante de disparo reservado na fila
  resolvedAt: isoDateSchema, // Momento da ação resolutiva
});

export type OfferResolutionResponse = z.infer<typeof offerResolutionResponseSchema>;
