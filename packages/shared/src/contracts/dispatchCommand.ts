// packages/shared/src/contracts/dispatchCommand.ts
import { z } from 'zod';
import { DispatchActionType } from '../enums/index.js';
import { objectIdSchema } from '../schemas/commonSchemas.js';

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
