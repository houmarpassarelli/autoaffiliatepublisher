export * from './dispatchQueue.js';
export * from './dispatchWorker.js';

import { dispatchQueue } from './dispatchQueue.js';
import { dispatchWorker } from './dispatchWorker.js';
import { redisConnection } from './redisClient.js';

export async function shutdownQueues(): Promise<void> {
  await dispatchWorker.close();
  await dispatchQueue.close();
  redisConnection.disconnect();
}
