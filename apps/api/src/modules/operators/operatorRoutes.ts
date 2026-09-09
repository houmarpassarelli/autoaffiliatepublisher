// apps/api/src/modules/operators/operatorRoutes.ts
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { availableOperatorListResponseSchema } from '@aap/shared';
import { OperatorModel } from '../../database/models/index.js';
import { isOperatorClaimed } from '../websocket/index.js';

/**
 * Leitura dos operadores para a tela-portão do Dashboard Remoto.
 *
 * Escopo intencionalmente restrito à carga da seleção. O CRUD completo do painel
 * administrativo é item próprio do CHECKLIST.md, Categoria 4.
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
};
