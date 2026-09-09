// packages/shared/src/schemas/operatorSchemas.ts
import { z } from 'zod';
import { isoDateSchema, objectIdSchema } from './commonSchemas.js';

/**
 * Operador cadastrado no Dashboard Administrativo.
 * Nota de segurança: não existe senha, token ou fluxo de autenticação. A identificação
 * serve exclusivamente para atribuição de autoria no comissionamento futuro
 * (ESPECS_TECNICAS.md, Seção 2.3).
 */
export const operatorDtoSchema = z.object({
  id: objectIdSchema,
  name: z.string(), // Obrigatório — exibido na tela-portão de seleção
  email: z.email().nullable(), // Opcional — apenas referência de contato
  active: z.boolean(), // Operador habilitado a aparecer na seleção
  isOnline: z.boolean(), // Controlado pela conexão WebSocket (presença ativa)
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export type OperatorDto = z.infer<typeof operatorDtoSchema>;

/**
 * Item da tela-portão do Dashboard Remoto. Nomes já reivindicados chegam com
 * `inUse: true` e são renderizados desabilitados, com a marcação "Em uso".
 */
export const availableOperatorDtoSchema = z.object({
  id: objectIdSchema,
  name: z.string(),
  inUse: z.boolean(),
});

export type AvailableOperatorDto = z.infer<typeof availableOperatorDtoSchema>;
