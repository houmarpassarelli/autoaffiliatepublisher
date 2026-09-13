// apps/api/src/modules/sources/sourceRoutes.ts
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  errorResponseSchema,
  resourceIdParamsSchema,
  sourceCreateSchema,
  sourceDtoSchema,
  sourceListResponseSchema,
  sourceUpdateSchema,
} from '@aap/shared';
import { createSource, deleteSource, listSources, updateSource, requireSource } from './sourceService.js';
import { runIngestionForSource } from '../ingestion/ingestionRunner.js';

/**
 * CRUD de fontes de coleta (`ESPECS_TECNICAS.md`, Seção 9).
 *
 * Rotas exclusivas do Dashboard Administrativo: são elas que concentram as
 * credenciais de API e o prompt da IA, que por decisão arquitetural não saem da
 * máquina local (`ARQUITETURA.md`, Seção 4.3).
 */
export const sourceRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/api/sources',
    { schema: { response: { 200: sourceListResponseSchema } } },
    async () => ({ sources: await listSources() }),
  );

  app.post(
    '/api/sources',
    {
      schema: {
        body: sourceCreateSchema,
        response: { 201: sourceDtoSchema, 409: errorResponseSchema },
      },
    },
    async (request, reply) => {
      const created = await createSource(request.body);

      return reply.status(201).send(created);
    },
  );

  app.put(
    '/api/sources/:id',
    {
      schema: {
        params: resourceIdParamsSchema,
        body: sourceUpdateSchema,
        response: {
          200: sourceDtoSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request) => updateSource(request.params.id, request.body),
  );

  /**
   * Exclusão. O 409 aqui não é corrida perdida — é fonte que já originou
   * ofertas e por isso não pode sumir sem levar a procedência delas junto.
   *
   * O 204 declara corpo nulo: a exclusão bem-sucedida não devolve conteúdo,
   * e o Fastify já suprime corpo e cabeçalhos de tamanho nessa faixa.
   */
  app.delete(
    '/api/sources/:id',
    {
      schema: {
        params: resourceIdParamsSchema,
        response: {
          204: z.null(),
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await deleteSource(request.params.id);

      return reply.status(204).send(null);
    },
  );

  /**
   * Disparo manual de varredura (Demanda 1.3).
   * Roda o pipeline completo de forma assíncrona, retornando 202 Accepted.
   */
  app.post(
    '/api/sources/:id/run',
    {
      schema: {
        params: resourceIdParamsSchema,
        response: {
          202: z.object({ message: z.string() }),
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const source = await requireSource(request.params.id);

      // Rodamos de forma assíncrona para não prender a resposta
      runIngestionForSource(source).catch((error) => {
        app.log.error({ err: error, sourceId: source._id }, 'Falha na varredura manual da fonte');
      });

      return reply.status(202).send({ message: 'Varredura iniciada' });
    },
  );
};
