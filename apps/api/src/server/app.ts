// apps/api/src/server/app.ts
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import {
  serializerCompiler,
  validatorCompiler,
  hasZodFastifySchemaValidationErrors,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { env, isProduction } from '../config/env.js';
import { healthRoutes } from './routes/healthRoutes.js';

/**
 * Monta a instância do Fastify com o type provider do Zod ativo.
 * A partir daqui, todo schema declarado numa rota vale simultaneamente como
 * validação em tempo de execução e como tipagem estática do handler.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      // Em desenvolvimento o log sai legível no terminal; em produção, JSON puro.
      transport: isProduction ? undefined : { target: 'pino-pretty' },
    },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Os dashboards são servidos por outra origem durante o desenvolvimento (Vite).
  await app.register(cors, {
    origin: env.CORS_ORIGINS,
    credentials: true,
  });

  /**
   * Tratamento central de erros: falhas de validação retornam 400 com o detalhe
   * de cada campo recusado, em vez do erro genérico do framework.
   */
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({
        message: 'Payload inválido.',
        issues: error.validation,
      });
    }

    request.log.error({ err: error }, 'Erro não tratado na requisição.');

    const statusCode = error.statusCode ?? 500;

    return reply.status(statusCode).send({
      message: statusCode >= 500 ? 'Erro interno do servidor.' : error.message,
    });
  });

  await app.register(healthRoutes);

  return app;
}
