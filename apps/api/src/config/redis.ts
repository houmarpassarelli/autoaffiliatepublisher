// apps/api/src/config/redis.ts
import { Redis } from 'ioredis';
import { env } from './env.js';

/**
 * Cliente Redis compartilhado pela aplicação.
 * `maxRetriesPerRequest: null` é exigência do BullMQ, que mantém conexões
 * bloqueantes de longa duração para consumir a fila de disparos.
 */
export function createRedisClient(): Redis {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });
}

let client: Redis | null = null;

/** Retorna o cliente único, criando-o e conectando-o na primeira chamada. */
export async function connectRedis(): Promise<Redis> {
  if (!client) {
    client = createRedisClient();
    await client.connect();
  }

  return client;
}

/** Encerra a conexão no desligamento gracioso do processo. */
export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}

/** Ping usado pelo healthcheck para confirmar que a fila tem backend disponível. */
export async function isRedisConnected(): Promise<boolean> {
  if (!client) {
    return false;
  }

  try {
    return (await client.ping()) === 'PONG';
  } catch {
    return false;
  }
}
