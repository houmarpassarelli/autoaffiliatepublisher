// packages/shared/src/schemas/sourceSchemas.ts
import { z } from 'zod';
import { SourceType } from '../enums/index.js';
import { isoDateSchema, objectIdSchema } from './commonSchemas.js';

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
