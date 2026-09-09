// apps/api/src/config/database.ts
import mongoose from 'mongoose';
import { env, isProduction } from './env.js';

/**
 * Abre a conexão única com o MongoDB.
 * A criação automática de índices fica desligada em produção: lá os índices são
 * aplicados de forma explícita e controlada por `ensureIndexes()`.
 */
export async function connectDatabase(): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  mongoose.set('autoIndex', !isProduction);

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10_000,
  });

  return mongoose;
}

/** Encerra a conexão no desligamento gracioso do processo. */
export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

/** Indica se a conexão está pronta para receber operações (usado pelo healthcheck). */
export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}
