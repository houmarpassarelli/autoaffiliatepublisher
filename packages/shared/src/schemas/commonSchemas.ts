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
 * Data serializada em ISO 8601.
 *
 * O DTO trafega **texto**, nunca `Date`: converter é responsabilidade do
 * mapeador de cada coleção, na fronteira entre a persistência e o contrato.
 *
 * A primeira versão aceitava também o `Date` do backend e normalizava com um
 * `transform`. Não funciona: o Fastify serializa a resposta pelo mesmo schema,
 * no sentido inverso, e um `transform` é unidirecional — toda rota que
 * devolvesse data falhava com 500 no momento de serializar. A conversão passou
 * para os mapeadores, onde o compilador cobra que ela aconteça.
 *
 * O deslocamento de fuso é aceito além do 'Z' porque as datas do domínio nascem
 * de captura e de ação humana, e o material fundacional do projeto registra
 * horários com deslocamento local.
 */
export const isoDateSchema = z.iso.datetime({ offset: true });

/**
 * Mapa de credenciais de acesso (chaves de API, tokens de bot, segredos de envio).
 * Nunca é exposto aos dashboards: o backend responde com a lista de chaves presentes,
 * jamais com os valores (ARQUITETURA.md, Seção 6 — Thin Client).
 */
export const credentialsSchema = z.record(z.string(), z.string());

/**
 * Corpo de erro devolvido pelo tratador central do Fastify.
 * Declarado no contrato para que o cliente saiba ler a recusa — em especial o
 * 409 de oferta já resolvida por outro operador — em vez de exibir uma
 * mensagem genérica de falha de rede.
 */
export const errorResponseSchema = z.object({
  message: z.string(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
