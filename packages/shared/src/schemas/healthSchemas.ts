// packages/shared/src/schemas/healthSchemas.ts
import { z } from 'zod';

/**
 * Contrato da rota de verificação de saúde da máquina administrativa.
 * Cada dependência crítica é reportada separadamente, para que uma queda do
 * Redis (fila) não seja confundida com uma queda do MongoDB (persistência).
 */
export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  uptimeSeconds: z.number(),
  dependencies: z.object({
    mongodb: z.boolean(),
    redis: z.boolean(),
  }),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
