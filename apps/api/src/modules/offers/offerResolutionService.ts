// apps/api/src/modules/offers/offerResolutionService.ts
import {
  OfferStatus,
  type DiscardCommand,
  type DispatchCommand,
  type OfferResolutionResponse,
} from '@aap/shared';
import type { Types } from 'mongoose';
import { env } from '../../config/env.js';
import {
  ChannelModel,
  DispatchLogModel,
  OfferModel,
  OperatorModel,
  SourceModel,
  type OfferAttributes,
  type OfferDocument,
} from '../../database/models/index.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../server/errors.js';
import { broadcastOfferStateChanged } from '../websocket/index.js';
import { calculateDispatchTime, findDispatchHorizon } from './dispatchScheduler.js';

/**
 * Ações resolutivas da oferta — "Publicar"/"Copiar" e "Descartar".
 *
 * As duas são saídas do mesmo evento de domínio: a decisão de um operador sobre
 * uma oferta que ainda está em `OPEN`. Por isso compartilham aqui o mesmo núcleo
 * — a transição atômica, a assinatura do operador e o broadcast — e divergem
 * apenas no estado de destino e no que cada uma deixa registrado.
 *
 * Diferença que não pode ser perdida de vista: o descarte **não** grava
 * `DispatchLog`. Nada foi publicado, e a base de auditoria é insumo direto do
 * comissionamento — registrar um descarte ali contaminaria o rateio futuro.
 */

/** Campos que uma ação resolutiva escreve na oferta. */
type ResolutionPatch = Pick<
  OfferAttributes,
  'status' | 'operatorId' | 'selectedChannels' | 'scheduledFor' | 'resolvedAt'
>;

/**
 * Operador que assina a ação.
 *
 * Só operadores ativos assinam: um operador desativado no cadastro não deve
 * conseguir resolver ofertas, mesmo com uma aba antiga ainda aberta.
 */
async function requireActiveOperator(
  operatorId: string,
): Promise<{ _id: Types.ObjectId; name: string }> {
  const operator = await OperatorModel.findOne({ _id: operatorId, active: true })
    .select({ name: 1 })
    .lean();

  if (!operator) {
    throw new NotFoundError('Operador não encontrado ou inativo.');
  }

  return { _id: operator._id, name: operator.name };
}

/**
 * Confere que todo canal escolhido existe e está ativo.
 *
 * Validado **antes** da transição atômica, de propósito: um comando com canal
 * inválido não pode consumir a oferta, que precisa continuar disponível para
 * outro operador. As chaves de canal alimentam a auditoria e o cruzamento de
 * comissão — chave inventada ali é dado permanentemente corrompido.
 */
async function requireActiveChannels(channelKeys: string[]): Promise<void> {
  const activeChannels = await ChannelModel.find({ key: { $in: channelKeys }, active: true })
    .select({ key: 1 })
    .lean();

  const activeKeys = new Set(activeChannels.map((channel) => channel.key));
  const rejected = channelKeys.filter((key) => !activeKeys.has(key));

  if (rejected.length > 0) {
    throw new BadRequestError(
      `Canais inexistentes ou desativados: ${rejected.join(', ')}. Recarregue a lista de canais.`,
    );
  }
}

/**
 * Transição atômica de estado — o coração do anti-concorrência.
 *
 * Só vence a primeira requisição que encontrar a oferta ainda em `OPEN`. As
 * concorrentes recebem `null` do MongoDB e são recusadas com 409. A trava **não**
 * pode depender do broadcast, que é assíncrono: o broadcast é a camada de
 * experiência, esta escrita condicional é a camada de correção
 * (ESPECS_TECNICAS.md, Seção 6).
 */
async function claimOpenOffer(offerId: string, patch: ResolutionPatch): Promise<OfferDocument> {
  const claimed = await OfferModel.findOneAndUpdate(
    { _id: offerId, status: OfferStatus.OPEN },
    { $set: patch },
    { returnDocument: 'after' },
  );

  if (claimed) {
    return claimed;
  }

  // Perder a corrida e mirar uma oferta inexistente são falhas diferentes, e o
  // operador precisa saber qual das duas aconteceu.
  const exists = await OfferModel.exists({ _id: offerId });

  if (!exists) {
    throw new NotFoundError('Oferta não encontrada.');
  }

  throw new ConflictError('Oferta já foi resolvida por outro operador.');
}

/** Anuncia a resolução a todas as telas conectadas e devolve a resposta de quem disparou. */
function announceResolution(offer: OfferDocument, operatorName: string): OfferResolutionResponse {
  const offerId = offer._id.toString();
  const scheduledFor = offer.scheduledFor?.toISOString() ?? null;
  const resolvedAt = (offer.resolvedAt ?? new Date()).toISOString();

  broadcastOfferStateChanged({
    offerId,
    status: offer.status,
    operatorId: offer.operatorId?.toString() ?? '',
    operatorName,
    scheduledFor,
  });

  return {
    offerId,
    status: offer.status,
    operatorName,
    selectedChannels: offer.selectedChannels,
    scheduledFor,
    resolvedAt,
  };
}

/**
 * Grava a auditoria do disparo.
 *
 * É o registro que viabiliza o comissionamento futuro, e por isso congela o que
 * pode mudar depois: preço no instante do disparo, SKU de cruzamento com os
 * relatórios das plataformas e o nome do operador, desnormalizado para que a
 * autoria sobreviva à remoção do cadastro (FLUXO_OPERACIONAL.md, Seção 8).
 *
 * `deliveryStatus` nasce vazio de propósito: o resultado por canal é do worker de
 * disparo, que ainda não existe. Prometê-lo aqui seria registrar como entregue
 * algo que nenhum driver enviou.
 */
async function recordDispatchLog(
  offer: OfferDocument,
  operator: { _id: Types.ObjectId; name: string },
  command: DispatchCommand,
): Promise<void> {
  const source = await SourceModel.findById(offer.sourceId).select({ name: 1 }).lean();

  await DispatchLogModel.create({
    offerId: offer._id,
    operatorId: operator._id,
    operatorName: operator.name,
    offerTitle: offer.title,
    sourceName: source?.name ?? 'Fonte removida',
    actionType: command.actionType,
    channels: command.channels,
    productSku: offer.externalSku,
    affiliateUrl: offer.affiliateUrl,
    priceAtDispatch: offer.priceCurrent,
    dispatchedAt: offer.resolvedAt ?? new Date(),
    deliveryStatus: {},
  });
}

/**
 * Comando de publicação — o clique em "Publicar" ou em "Copiar para Área de
 * Transferência". As duas ações têm o mesmo peso e percorrem exatamente este
 * caminho; o que muda é apenas o `actionType` registrado na auditoria
 * (FLUXO_OPERACIONAL.md, Seção 5).
 *
 * O Dashboard Remoto é Thin Client: ele declara a intenção, e a execução real
 * acontece só aqui, na máquina administrativa.
 */
export async function dispatchOffer(
  offerId: string,
  command: DispatchCommand,
): Promise<OfferResolutionResponse> {
  const operator = await requireActiveOperator(command.operatorId);

  await requireActiveChannels(command.channels);

  // Fila vazia dispara na hora e a oferta vai direto para COMPLETED; fila ocupada
  // reserva um horário e a oferta espera em SCHEDULED.
  const dispatchTime = calculateDispatchTime(await findDispatchHorizon(), env.DISPATCH_INTERVAL_MS);
  const isImmediate = dispatchTime.getTime() <= Date.now();

  const claimed = await claimOpenOffer(offerId, {
    status: isImmediate ? OfferStatus.COMPLETED : OfferStatus.SCHEDULED,
    operatorId: operator._id,
    selectedChannels: command.channels,
    scheduledFor: dispatchTime,
    resolvedAt: new Date(),
  });

  const { injectOperatorSubId, replaceUrlInCopy } = await import('@aap/shared');
  const trackedUrl = injectOperatorSubId(claimed.affiliateUrl, operator._id.toString());
  const baseUrl = claimed.affiliateUrl;
  
  claimed.affiliateUrl = trackedUrl;
  
  const aiCopyMap = claimed.aiCopy as unknown as Map<string, string>;
  if (aiCopyMap instanceof Map) {
    const formats = ['messaging', 'social', 'article'];
    for (const format of formats) {
      if (aiCopyMap.has(format)) {
        const originalText = aiCopyMap.get(format) ?? '';
        aiCopyMap.set(format, replaceUrlInCopy(originalText, baseUrl, trackedUrl));
      }
    }
  } else if (typeof claimed.aiCopy === 'object') {
    const aiCopyObj = claimed.aiCopy as Record<string, string>;
    const formats = ['messaging', 'social', 'article'];
    for (const format of formats) {
      if (aiCopyObj[format]) {
        aiCopyObj[format] = replaceUrlInCopy(aiCopyObj[format], baseUrl, trackedUrl);
      }
    }
  }

  await claimed.save();
  await recordDispatchLog(claimed, operator, command);

  const { dispatchQueue } = await import('../queues/dispatchQueue.js');
  const delay = Math.max(0, dispatchTime.getTime() - Date.now());
  
  await dispatchQueue.add(
    'DISPATCH_OFFER',
    { offerId, channels: command.channels, operatorId: command.operatorId, actionType: command.actionType },
    { delay }
  );

  return announceResolution(claimed, operator.name);
}

/**
 * Comando de descarte — o clique em "Descartar".
 *
 * `DISCARDED` é estado terminal e, mais que isso, é lista de bloqueio: a
 * deduplicação da ingestão ignora qualquer oferta cujo `dedupeHash` já exista em
 * **qualquer** estado, inclusive este. Descartar aqui é dizer "não quero este
 * produto", e não apenas "não quero agora" (ESPECS_TECNICAS.md, Seção 8.1).
 */
export async function discardOffer(
  offerId: string,
  command: DiscardCommand,
): Promise<OfferResolutionResponse> {
  const operator = await requireActiveOperator(command.operatorId);

  const claimed = await claimOpenOffer(offerId, {
    status: OfferStatus.DISCARDED,
    operatorId: operator._id,
    selectedChannels: [],
    scheduledFor: null, // O descarte não reserva lugar na fila de disparo.
    resolvedAt: new Date(),
  });

  return announceResolution(claimed, operator.name);
}

/**
 * Regenera a copy da oferta usando o módulo de IA.
 * Resgata a fonte associada para obter o prompt template e pede ao LLM
 * uma nova geração de copy, atualizando a oferta e respondendo com o novo estado.
 */
export async function regenerateOfferCopy(offerId: string) {
  const offer = await OfferModel.findById(offerId);

  if (!offer) {
    throw new NotFoundError('Oferta não encontrada.');
  }

  if (offer.status !== OfferStatus.OPEN) {
    throw new BadRequestError('Apenas ofertas abertas podem ter a copy regenerada.');
  }

  const source = await SourceModel.findById(offer.sourceId).select({ name: 1, aiPromptTemplate: 1 }).lean();
  const sourceName = source?.name ?? 'Fonte removida';
  const promptTemplate = source?.aiPromptTemplate ?? 'Gere uma copy atrativa ressaltando o desconto.';

  const { aiService } = await import('../ai/aiService.js');
  
  const newCopy = await aiService.generateCopy({
    title: offer.title,
    priceOriginal: offer.priceOriginal,
    priceCurrent: offer.priceCurrent,
    discountPct: offer.discountPct,
    sourceName: sourceName,
    affiliateUrl: offer.affiliateUrl,
  }, promptTemplate);

  offer.set('aiCopy', newCopy);
  await offer.save();

  const { toOfferDto } = await import('./offerMapper.js');
  return toOfferDto(offer, sourceName);
}
