// apps/api/src/modules/offers/dispatchScheduler.ts
import { OfferStatus } from '@aap/shared';
import { OfferModel } from '../../database/models/index.js';

/**
 * Política anti-spam do projeto: cliques em sequência não viram disparos
 * simultâneos (FLUXO_OPERACIONAL.md, Seção 9.1).
 */

/**
 * Calcula o instante de disparo de uma oferta recém-aprovada.
 *
 * Regra implementada: **nenhum disparo acontece a menos de Δ do anterior.** Fila
 * vazia dispara imediatamente; o Δ seguinte é sempre contado a partir do último
 * disparo reservado (ARQUITETURA.md, Seção 7 — "item 1 imediato, item 2 em +Δ,
 * item 3 em +2Δ").
 *
 * **Divergência deliberada do trecho de código do ESPECS_TECNICAS.md, Seção 7.**
 * Aquele trecho devolve "agora" sempre que o último agendamento já passou:
 *
 *     if (!lastScheduledAt || lastScheduledAt.getTime() <= now.getTime()) return now;
 *
 * Isso só preserva o anti-spam enquanto o disparo imediato ainda estiver
 * pendente numa fila — no instante em que ele é processado, dois cliques
 * seguidos voltam a produzir dois disparos instantâneos. Foi exatamente o que a
 * verificação da sessão de 09/09/2026 reproduziu: a segunda oferta saiu 214 ms
 * depois da primeira. A rajada é o que a política existe para impedir
 * (FLUXO_OPERACIONAL.md, Seção 9.1), então prevalece a regra dos outros dois
 * documentos, e não a literalidade do trecho.
 *
 * O horizonte "vencido" continua existindo, com o sentido correto: ele venceu
 * quando a janela de Δ já se esgotou, e não quando o instante apenas passou.
 */
export function calculateDispatchTime(dispatchHorizon: Date | null, intervalMs: number): Date {
  const now = new Date();

  // Fila vazia: dispara agora (OPEN -> COMPLETED direto).
  if (!dispatchHorizon) {
    return now;
  }

  const nextAllowed = dispatchHorizon.getTime() + intervalMs;

  // Janela anti-spam do disparo anterior já esgotada: pode disparar agora.
  if (nextAllowed <= now.getTime()) {
    return now;
  }

  // Fila ocupada: entra em SCHEDULED, escalonado após o último disparo reservado.
  return new Date(nextAllowed);
}

/**
 * Instante de disparo mais distante já reservado por uma oferta aprovada.
 *
 * **Ponto de extensão da Demanda 2.1.** Quando a fila BullMQ existir, o horizonte
 * passa a ser lido dela — é o último job enfileirado que define o escalonamento.
 * Enquanto ela não existe, a própria coleção de ofertas é a representação fiel da
 * fila: toda oferta aprovada grava o seu `scheduledFor`, inclusive a que dispara
 * de imediato. Sem gravar o instante da imediata, dois cliques seguidos com a
 * fila vazia produziriam dois disparos instantâneos — exatamente a rajada que a
 * política anti-spam existe para impedir.
 *
 * O descarte nunca entra na conta: ele não reserva disparo nenhum.
 */
export async function findDispatchHorizon(): Promise<Date | null> {
  const lastReserved = await OfferModel.findOne({
    status: { $in: [OfferStatus.SCHEDULED, OfferStatus.COMPLETED] },
    scheduledFor: { $ne: null },
  })
    .sort({ scheduledFor: -1 })
    .select({ scheduledFor: 1 })
    .lean();

  return lastReserved?.scheduledFor ?? null;
}
