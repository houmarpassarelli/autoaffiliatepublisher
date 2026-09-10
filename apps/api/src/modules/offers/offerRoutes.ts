// apps/api/src/modules/offers/offerRoutes.ts
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  discardCommandSchema,
  dispatchCommandSchema,
  errorResponseSchema,
  offerIdParamsSchema,
  offerListQuerySchema,
  offerListResponseSchema,
  offerResolutionResponseSchema,
  offerDtoSchema,
} from '@aap/shared';
import { listOffersByStatus } from './offerQueryService.js';
import { discardOffer, dispatchOffer } from './offerResolutionService.js';

/**
 * Rotas de oferta consumidas pelo Dashboard Remoto.
 *
 * A comunicação do projeto é híbrida: a carga inicial de cada aba e os comandos
 * do operador viajam por HTTP; a propagação do resultado para as demais telas é
 * do WebSocket (ARQUITETURA.md, Seção 5). Por isso as duas rotas de ação
 * respondem ao autor da ação e emitem broadcast para todos os outros.
 */
export const offerRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/api/offers',
    {
      schema: {
        querystring: offerListQuerySchema,
        response: { 200: offerListResponseSchema },
      },
    },
    async (request) => {
      const { status, limit } = request.query;

      return { offers: await listOffersByStatus(status, limit) };
    },
  );

  /**
   * Comando de publicação (Thin Client → servidor).
   * O 409 é resposta esperada e frequente, não exceção: significa que outro
   * operador resolveu a mesma oferta entre o render do card e este clique.
   */
  app.post(
    '/api/offers/:id/dispatch',
    {
      schema: {
        params: offerIdParamsSchema,
        body: dispatchCommandSchema,
        response: {
          200: offerResolutionResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request) => dispatchOffer(request.params.id, request.body),
  );

  /** Comando de descarte. Estado terminal que alimenta o histórico anti-recaptura. */
  app.post(
    '/api/offers/:id/discard',
    {
      schema: {
        params: offerIdParamsSchema,
        body: discardCommandSchema,
        response: {
          200: offerResolutionResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request) => discardOffer(request.params.id, request.body),
  );

  /** Comando de regeneração de copy da IA (mock até a Demanda 1.4). */
  app.post(
    '/api/offers/:id/regenerate',
    {
      schema: {
        params: offerIdParamsSchema,
        response: {
          200: offerDtoSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const { regenerateOfferCopy } = await import('./offerResolutionService.js');
      return regenerateOfferCopy(request.params.id);
    },
  );
};
