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

/** Carga da tela-portão do Dashboard Remoto. */
export const availableOperatorListResponseSchema = z.object({
  operators: z.array(availableOperatorDtoSchema),
});

export type AvailableOperatorListResponse = z.infer<typeof availableOperatorListResponseSchema>;

/**
 * Campos editáveis de um operador.
 *
 * O cadastro é deliberadamente mínimo: nome obrigatório, e-mail opcional e
 * status. Não há senha nem token, porque a identificação existe para atribuição
 * de autoria no comissionamento, não para controle de acesso
 * (`FLUXO_OPERACIONAL.md`, Seção 7.1).
 *
 * O e-mail vazio chega do formulário como texto em branco e é normalizado para
 * `null`: sem isso, o índice único de e-mail futuro e as consultas de contato
 * teriam de distinguir "não informado" de "informado como string vazia".
 */
const operatorWritableFieldsSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome exibido na tela-portão de seleção.'),
  email: z
    .union([z.email('Informe um e-mail válido.'), z.literal('')])
    .nullish()
    .transform((value) => (value ? value : null)),
  active: z.boolean(), // Operador habilitado a aparecer na seleção
});

/** Cadastro de um operador novo. */
export const operatorCreateSchema = operatorWritableFieldsSchema;

export type OperatorCreateInput = z.infer<typeof operatorCreateSchema>;

/** Edição de um operador existente. */
export const operatorUpdateSchema = operatorWritableFieldsSchema;

export type OperatorUpdateInput = z.infer<typeof operatorUpdateSchema>;

/**
 * Listagem do painel administrativo — inclui os operadores desativados, que a
 * tela-portão do dashboard remoto não enxerga.
 */
export const operatorListResponseSchema = z.object({
  operators: z.array(operatorDtoSchema),
});

export type OperatorListResponse = z.infer<typeof operatorListResponseSchema>;
