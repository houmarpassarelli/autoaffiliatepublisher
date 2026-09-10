// apps/api/src/modules/operators/operatorRoutes.ts
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  availableOperatorListResponseSchema,
  errorResponseSchema,
  operatorCreateSchema,
  operatorDtoSchema,
  operatorListResponseSchema,
  operatorUpdateSchema,
  resourceIdParamsSchema,
} from '@aap/shared';
import { OperatorModel } from '../../database/models/index.js';
import { isOperatorClaimed } from '../websocket/index.js';
import {
  createOperator,
  deleteOperator,
  listOperators,
  updateOperator,
} from './operatorService.js';

/**
 * Rotas de operador dos dois dashboards.
 *
 * `/api/operators/available` é a carga da tela-portão do Dashboard Remoto: DTO
 * reduzido, só nomes ativos, com a marcação "Em uso". As demais compõem o CRUD
 * do painel administrativo (`ESPECS_TECNICAS.md`, Seção 9) e devolvem o cadastro
 * inteiro, inclusive os operadores desativados.
 */
export const operatorRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/api/operators/available',
    { schema: { response: { 200: availableOperatorListResponseSchema } } },
    async () => {
      const operators = await OperatorModel.find({ active: true })
        .sort({ name: 1 })
        .select({ name: 1 })
        .lean();

      return {
        operators: operators.map((operator) => ({
          id: operator._id.toString(),
          name: operator.name,

          // A marcação "Em uso" vem do registro de conexões vivas, não do campo
          // `isOnline` do banco: a verdade sobre presença é o socket aberto, e o
          // campo persistido é apenas a projeção dele. Consultar a fonte certa
          // aqui evita que uma projeção defasada bloqueie um nome livre.
          inUse: isOperatorClaimed(operator._id.toString()),
        })),
      };
    },
  );

  app.get(
    '/api/operators',
    { schema: { response: { 200: operatorListResponseSchema } } },
    async () => ({ operators: await listOperators() }),
  );

  app.post(
    '/api/operators',
    {
      schema: {
        body: operatorCreateSchema,
        response: { 201: operatorDtoSchema, 409: errorResponseSchema },
      },
    },
    async (request, reply) => {
      const created = await createOperator(request.body);

      return reply.status(201).send(created);
    },
  );

  /** Desativar aqui encerra a sessão do operador, se ele estiver conectado. */
  app.put(
    '/api/operators/:id',
    {
      schema: {
        params: resourceIdParamsSchema,
        body: operatorUpdateSchema,
        response: {
          200: operatorDtoSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request) => updateOperator(request.params.id, request.body),
  );

  /**
   * Exclusão. O 409 significa operador que já assina ofertas ou disparos.
   * O 204 declara corpo nulo: a exclusão bem-sucedida não devolve conteúdo,
   * e o Fastify já suprime corpo e cabeçalhos de tamanho nessa faixa.
   */
  app.delete(
    '/api/operators/:id',
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
      await deleteOperator(request.params.id);

      return reply.status(204).send(null);
    },
  );
};
