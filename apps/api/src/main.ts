// apps/api/src/main.ts
import type { FastifyInstance } from 'fastify';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { ensureIndexes } from './database/models/index.js';
import { buildApp } from './server/app.js';

/**
 * Ponto de entrada da máquina administrativa.
 *
 * Ordem de inicialização deliberada: as dependências de infraestrutura sobem
 * antes do servidor HTTP, para que nenhuma requisição seja aceita enquanto o
 * banco ou a fila ainda não estiverem prontos.
 */
async function bootstrap(): Promise<void> {
  await connectDatabase();
  await ensureIndexes();
  await connectRedis();

  const app = await buildApp();

  registerShutdownHandlers(app);

  await app.listen({ host: env.HOST, port: env.PORT });
}

/**
 * Desligamento gracioso: para de aceitar novas requisições, encerra as conexões
 * abertas e só então derruba o processo. Evita deixar registros pela metade em
 * disparos e varreduras em andamento.
 */
function registerShutdownHandlers(app: FastifyInstance): void {
  const signals = ['SIGINT', 'SIGTERM'] as const;

  for (const signal of signals) {
    process.once(signal, () => {
      void (async () => {
        app.log.info(`Sinal ${signal} recebido. Encerrando a aplicação.`);

        try {
          await app.close();
          await disconnectRedis();
          await disconnectDatabase();
          process.exit(0);
        } catch (error) {
          app.log.error({ err: error }, 'Falha no desligamento gracioso.');
          process.exit(1);
        }
      })();
    });
  }
}

bootstrap().catch((error: unknown) => {
  console.error('Falha na inicialização da aplicação:', error);
  process.exit(1);
});
