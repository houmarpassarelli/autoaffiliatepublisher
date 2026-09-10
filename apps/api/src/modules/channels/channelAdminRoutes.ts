// apps/api/src/modules/channels/channelAdminRoutes.ts
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  adminChannelDtoSchema,
  adminChannelListResponseSchema,
  channelCreateSchema,
  channelUpdateSchema,
  errorResponseSchema,
  resourceIdParamsSchema,
} from '@aap/shared';
import {
  createChannel,
  deleteChannel,
  listChannelsForAdmin,
  updateChannel,
} from './channelService.js';

/**
 * CRUD de canais de destino (`ESPECS_TECNICAS.md`, Seção 9).
 *
 * Separado de `channelRoutes.ts` de propósito: aquele arquivo é a leitura do
 * dashboard remoto (`/api/channels/active`), com DTO reduzido e apenas canais
 * ativos. Aqui trafegam os nomes das credenciais e os registros desativados,
 * que só o painel local vê.
 */
export const channelAdminRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/api/channels',
    { schema: { response: { 200: adminChannelListResponseSchema } } },
    async () => ({ channels: await listChannelsForAdmin() }),
  );

  app.post(
    '/api/channels',
    {
      schema: {
        body: channelCreateSchema,
        response: { 201: adminChannelDtoSchema, 409: errorResponseSchema },
      },
    },
    async (request, reply) => {
      const created = await createChannel(request.body);

      return reply.status(201).send(created);
    },
  );

  app.put(
    '/api/channels/:id',
    {
      schema: {
        params: resourceIdParamsSchema,
        body: channelUpdateSchema,
        response: {
          200: adminChannelDtoSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request) => updateChannel(request.params.id, request.body),
  );

  /**
   * Exclusão. O 409 significa canal já usado em oferta ou em auditoria.
   * O 204 declara corpo nulo: a exclusão bem-sucedida não devolve conteúdo,
   * e o Fastify já suprime corpo e cabeçalhos de tamanho nessa faixa.
   */
  app.delete(
    '/api/channels/:id',
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
      await deleteChannel(request.params.id);

      return reply.status(204).send(null);
    },
  );
};
