import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import { OfferStatus } from '@aap/shared';
import { redisConnection } from './redisClient.js';
import { DISPATCH_QUEUE_NAME } from './dispatchQueue.js';
import type { DispatchJobData } from './dispatchQueue.js';
import { OfferModel, DispatchLogModel } from '../../database/models/index.js';
import { broadcastOfferPublished } from '../websocket/index.js';

/**
 * Worker da Fila de Disparos.
 *
 * Ele pega o job enfileirado quando o seu tempo de espera (delay) for alcançado,
 * e efetua o trabalho pesado. No momento, como os drivers não existem ainda, ele
 * atualiza a oferta para COMPLETED e emite o aviso via WebSocket.
 */
export const dispatchWorker = new Worker<DispatchJobData>(
  DISPATCH_QUEUE_NAME,
  async (job: Job<DispatchJobData>) => {
    const { offerId } = job.data;

    // A atualização para COMPLETED se for SCHEDULED:
    const offer = await OfferModel.findOneAndUpdate(
      { _id: offerId, status: OfferStatus.SCHEDULED },
      { $set: { status: OfferStatus.COMPLETED } },
      { new: true }
    ).lean();

    // Se já estava em COMPLETED (ex. quando era imediata), apenas prossegue ou ignora.
    if (!offer) {
      // Tenta achar se ela está finalizada já
      const existing = await OfferModel.findById(offerId).lean();
      if (!existing || existing.status !== OfferStatus.COMPLETED) {
        throw new Error(`Oferta ${offerId} não encontrada ou em estado inválido para disparo.`);
      }
    }

    // TODO (Sprint 3): Aqui seriam invocados os drivers de canais.
    // Para esta etapa (Demanda 2.1), apenas simulamos o sucesso (delivery vazio ou mock).
    const deliveryStatus = {};

    // Atualizamos o DispatchLog com o status da entrega, se tivéssemos.
    await DispatchLogModel.updateOne(
      { offerId },
      { $set: { deliveryStatus } }
    );

    // Emite o broadcast para atualizar a aba "Concluídas" do Dashboard Remoto.
    broadcastOfferPublished(offerId, deliveryStatus);
    
    return { success: true, offerId, deliveryStatus };
  },
  {
    connection: redisConnection,
    concurrency: 1, // Se for sequencial por canal, podemos limitar a concorrência.
  }
);

dispatchWorker.on('failed', (job, err) => {
  console.error(`Falha no job ${job?.id} da oferta ${job?.data.offerId}:`, err);
});
