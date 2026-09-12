// apps/api/src/modules/sources/sourceMapper.ts
import type { SourceDto, SourceType } from '@aap/shared';
import type { Types } from 'mongoose';
import { toCredentialKeys, type StoredCredentials } from '../../database/credentials.js';
import type { SourceAttributes } from '../../database/models/index.js';

/** Forma mínima consumida pelo mapeador — serve ao documento hidratado e ao `lean()`. */
export type MappableSource = Omit<SourceAttributes, 'credentials'> & {
  _id: Types.ObjectId;
  credentials?: StoredCredentials;
};

/**
 * Converte a fonte persistida no DTO do Dashboard Administrativo.
 *
 * Os **valores** das credenciais são substituídos pela lista de nomes das
 * chaves cadastradas. A regra é sustentada pelo tipo: `SourceDto` sequer
 * declara um campo `credentials`, de modo que devolvê-lo aqui não compilaria.
 */
export function toSourceDto(source: MappableSource): SourceDto {
  return {
    id: source._id.toString(),
    name: source.name,
    type: source.type as SourceType,
    url: source.url,
    credentialKeys: toCredentialKeys(source.credentials),
    affiliateTag: source.affiliateTag,
    cronExpression: source.cronExpression,
    aiPromptTemplate: source.aiPromptTemplate,
    active: source.active,
    complianceVerified: source.complianceVerified,
    lastRunAt: source.lastRunAt ? source.lastRunAt.toISOString() : null,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
  };
}
