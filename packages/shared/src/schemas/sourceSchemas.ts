// packages/shared/src/schemas/sourceSchemas.ts
import { z } from 'zod';
import { SourceType } from '../enums/index.js';
import {
  credentialsPatchSchema,
  cronExpressionSchema,
  isoDateSchema,
  objectIdSchema,
} from './commonSchemas.js';

/**
 * Representação de uma fonte de coleta trafegada para o Dashboard Administrativo.
 * As credenciais são deliberadamente omitidas: o painel exibe apenas quais chaves
 * estão cadastradas, nunca os seus valores.
 */
export const sourceDtoSchema = z.object({
  id: objectIdSchema,
  name: z.string(), // Nome da loja/plataforma exibido no painel
  type: z.enum(SourceType), // Mecanismo de coleta
  url: z.url(), // Endpoint da API, URL do feed ou página de ofertas
  credentialKeys: z.array(z.string()), // Nomes das credenciais cadastradas (sem os valores)
  affiliateTag: z.string(), // Tag/ID de afiliado usada na conversão de link
  cronExpression: z.string(), // Intervalo de varredura (ex.: '0 * * * *')
  aiPromptTemplate: z.string(), // Instrução específica de como a IA reescreve esta fonte
  active: z.boolean(), // Fonte habilitada para varredura
  lastRunAt: isoDateSchema.nullable(), // Última execução bem-sucedida da coleta
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export type SourceDto = z.infer<typeof sourceDtoSchema>;

/**
 * Campos editáveis de uma fonte de coleta, comuns à criação e à edição.
 *
 * `credentials` fica de fora deliberadamente: ela não é um campo como os
 * outros. A escrita de credencial é merge patch, porque o cliente nunca recebe
 * os valores de volta e não teria como reenviá-los inteiros numa edição.
 */
const sourceWritableFieldsSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da loja ou plataforma.'),
  type: z.enum(SourceType), // Mecanismo de coleta: API, RSS ou SCRAPER
  url: z.url('Informe uma URL válida do endpoint, do feed ou da página de ofertas.'),
  affiliateTag: z.string().trim().min(1, 'Informe a tag de afiliado usada na conversão de link.'),
  cronExpression: cronExpressionSchema, // Intervalo de varredura consumido pelo scheduler
  aiPromptTemplate: z
    .string()
    .trim()
    .min(1, 'Informe como a IA deve reescrever as ofertas desta fonte.'),
  active: z.boolean(), // Fonte habilitada para varredura
});

/** Cadastro de uma fonte nova no Dashboard Administrativo. */
export const sourceCreateSchema = sourceWritableFieldsSchema.extend({
  // Na criação, o patch de credenciais é simplesmente o mapa inicial.
  credentials: credentialsPatchSchema.optional(),
});

export type SourceCreateInput = z.infer<typeof sourceCreateSchema>;

/**
 * Edição de uma fonte existente.
 *
 * Os campos comuns viajam completos, como manda o PUT da tabela de rotas do
 * `ESPECS_TECNICAS.md`, Seção 9. A única exceção é `credentials`, pelo motivo
 * registrado acima: ali o corpo é patch, não substituição.
 */
export const sourceUpdateSchema = sourceWritableFieldsSchema.extend({
  credentials: credentialsPatchSchema.optional(),
});

export type SourceUpdateInput = z.infer<typeof sourceUpdateSchema>;

/** Listagem do painel administrativo — inclui as fontes desativadas. */
export const sourceListResponseSchema = z.object({
  sources: z.array(sourceDtoSchema),
});

export type SourceListResponse = z.infer<typeof sourceListResponseSchema>;
