// packages/shared/src/schemas/commonSchemas.ts
import { z } from 'zod';

/**
 * Identificador de documento do MongoDB já serializado como texto.
 * Os DTOs trafegam sempre com o ObjectId convertido em string — o tipo nativo
 * do driver não existe no navegador.
 */
export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Identificador inválido: esperado um ObjectId de 24 caracteres.');

/**
 * Data serializada em ISO 8601. Aceita tanto o objeto Date do backend quanto
 * a string recebida pelo cliente, normalizando o resultado para string.
 */
export const isoDateSchema = z
  .union([z.iso.datetime(), z.date()])
  .transform((value) => (value instanceof Date ? value.toISOString() : value));

/**
 * Mapa de credenciais de acesso (chaves de API, tokens de bot, segredos de envio).
 * Nunca é exposto aos dashboards: o backend responde com a lista de chaves presentes,
 * jamais com os valores (ARQUITETURA.md, Seção 6 — Thin Client).
 */
export const credentialsSchema = z.record(z.string(), z.string());
