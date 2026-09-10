import { Queue } from 'bullmq';
import { redisConnection } from './redisClient.js';
import type { DispatchCommand } from '@aap/shared';

// O job carrega os mesmos dados do DispatchCommand, além do ID da oferta.
export interface DispatchJobData extends DispatchCommand {
  offerId: string;
}

export const DISPATCH_QUEUE_NAME = 'DISPATCH_OFFER';

export const dispatchQueue = new Queue<DispatchJobData>(DISPATCH_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5s, 10s, 20s
    },
    removeOnComplete: true,
    removeOnFail: 1000,
  },
});
