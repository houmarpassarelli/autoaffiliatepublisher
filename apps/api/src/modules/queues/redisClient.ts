import { createRedisClient } from '../../config/redis.js';

/**
 * Conexão Redis instanciada exclusivamente para o BullMQ (Queue e Worker requerem instâncias
 * independentes para lidar com subscrições bloqueantes).
 */
export const redisConnection = createRedisClient();
