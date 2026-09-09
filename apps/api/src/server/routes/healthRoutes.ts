// apps/api/src/server/routes/healthRoutes.ts
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { healthResponseSchema } from '@aap/shared';
import { isDatabaseConnected } from '../../config/database.js';
import { isRedisConnected } from '../../config/redis.js';

/**
 * Rota de verificação de saúde da máquina administrativa.
 * Responde 503 quando qualquer dependência está indisponível, permitindo que os
 * dashboards sinalizem o estado real do backend em vez de falharem silenciosamente.
 */
export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/health',
    {
      schema: {
        response: {
          200: healthResponseSchema,
          503: healthResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      const mongodb = isDatabaseConnected();
      const redis = await isRedisConnected();
      const isHealthy = mongodb && redis;

      return reply.status(isHealthy ? 200 : 503).send({
        status: isHealthy ? 'ok' : 'degraded',
        uptimeSeconds: Math.round(process.uptime()),
        dependencies: { mongodb, redis },
      });
    },
  );
};
