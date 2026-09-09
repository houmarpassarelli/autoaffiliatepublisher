// apps/api/src/modules/offers/offerQueryService.ts
import type { OfferDto, OfferStatus } from '@aap/shared';
import type { Types } from 'mongoose';
import { OfferModel, OperatorModel, SourceModel } from '../../database/models/index.js';
import { toOfferDto, withOperatorName, type MappableOffer } from './offerMapper.js';

/** Índice `id -> nome` de uma coleção de referência, resolvido em uma única consulta. */
type NameIndex = Map<string, string>;

/**
 * Resolve os nomes das lojas de origem de um lote de ofertas.
 * Uma consulta para o lote inteiro, e não uma por card: a aba Abertas pode
 * carregar dezenas de itens de poucas fontes distintas.
 */
async function indexSourceNames(sourceIds: Types.ObjectId[]): Promise<NameIndex> {
  const sources = await SourceModel.find({ _id: { $in: sourceIds } })
    .select({ name: 1 })
    .lean();

  return new Map(sources.map((source) => [source._id.toString(), source.name]));
}

/** Mesma estratégia para a assinatura do operador nas abas Agendadas e Concluídas. */
async function indexOperatorNames(operatorIds: Types.ObjectId[]): Promise<NameIndex> {
  if (operatorIds.length === 0) {
    return new Map();
  }

  const operators = await OperatorModel.find({ _id: { $in: operatorIds } })
    .select({ name: 1 })
    .lean();

  return new Map(operators.map((operator) => [operator._id.toString(), operator.name]));
}

/**
 * Carga inicial de uma aba do Dashboard Remoto.
 *
 * A ordenação decrescente por `createdAt` é regra de domínio, não preferência de
 * quem chama: é ela que coloca as ofertas mais recentes no topo, no mesmo lugar
 * onde o broadcast `OFFER_CREATED` insere as que chegarem depois
 * (FLUXO_OPERACIONAL.md, Seções 3.1 e 4.3).
 */
export async function listOffersByStatus(status: OfferStatus, limit: number): Promise<OfferDto[]> {
  const offers = await OfferModel.find({ status })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<MappableOffer[]>();

  if (offers.length === 0) {
    return [];
  }

  const sourceIds = offers.map((offer) => offer.sourceId);

  const operatorIds = offers
    .map((offer) => offer.operatorId)
    .filter((operatorId): operatorId is Types.ObjectId => operatorId !== null);

  const [sourceNames, operatorNames] = await Promise.all([
    indexSourceNames(sourceIds),
    indexOperatorNames(operatorIds),
  ]);

  return offers.map((offer) => {
    const dto = toOfferDto(offer, sourceNames.get(offer.sourceId.toString()) ?? 'Fonte removida');
    const operatorName = offer.operatorId
      ? (operatorNames.get(offer.operatorId.toString()) ?? null)
      : null;

    return withOperatorName(dto, operatorName);
  });
}
