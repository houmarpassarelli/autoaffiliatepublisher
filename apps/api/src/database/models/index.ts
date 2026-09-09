// apps/api/src/database/models/index.ts
import type { Model } from 'mongoose';
import { SourceModel } from './sourceModel.js';
import { OfferModel } from './offerModel.js';
import { OperatorModel } from './operatorModel.js';
import { ChannelModel } from './channelModel.js';
import { DispatchLogModel } from './dispatchLogModel.js';

export * from './sourceModel.js';
export * from './offerModel.js';
export * from './operatorModel.js';
export * from './channelModel.js';
export * from './dispatchLogModel.js';

// Registro central dos models: qualquer coleção nova entra aqui e passa a ter
// os seus índices sincronizados automaticamente na inicialização.
const registeredModels: Model<unknown>[] = [
  SourceModel,
  OfferModel,
  OperatorModel,
  ChannelModel,
  DispatchLogModel,
] as unknown as Model<unknown>[];

/**
 * Sincroniza os índices declarados nos schemas com o estado real do banco.
 * `syncIndexes` cria os que faltam e remove os que deixaram de ser declarados,
 * garantindo que a deduplicação por `dedupeHash` e as consultas das abas e da
 * auditoria nunca dependam de varredura completa de coleção.
 */
export async function ensureIndexes(): Promise<void> {
  await Promise.all(registeredModels.map((registeredModel) => registeredModel.syncIndexes()));
}
