// apps/api/src/modules/operators/operatorMapper.ts
import type { OperatorDto } from '@aap/shared';
import type { Types } from 'mongoose';
import type { OperatorAttributes } from '../../database/models/index.js';

/** Forma mínima consumida pelo mapeador — serve ao documento hidratado e ao `lean()`. */
export type MappableOperator = OperatorAttributes & { _id: Types.ObjectId };

/**
 * Converte o operador persistido no DTO do Dashboard Administrativo.
 *
 * `lastSeenAt` não entra: é insumo interno da reconciliação de presença órfã,
 * não informação de cadastro. O que o painel precisa saber sobre presença é
 * `isOnline`, e mesmo esse é projeção — a verdade é o socket vivo.
 */
export function toOperatorDto(operator: MappableOperator): OperatorDto {
  return {
    id: operator._id.toString(),
    name: operator.name,
    email: operator.email,
    active: operator.active,
    isOnline: operator.isOnline,
    createdAt: operator.createdAt.toISOString(),
    updatedAt: operator.updatedAt.toISOString(),
  };
}
