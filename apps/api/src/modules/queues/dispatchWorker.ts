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
      return { success: true, offerId, deliveryStatus: {} };
    }

    // 1. Reverificação de Preço e Disponibilidade
    const { SourceModel } = await import('../../database/models/index.js');
    const { IngestorFactory } = await import('../ingestion/ingestorFactory.js');
    const { broadcastOfferStateChanged } = await import('../websocket/index.js');

    const source = await SourceModel.findById(offer.sourceId);
    if (source) {
      const ingestor = IngestorFactory.create(source.type);
      const latestOfferData = await ingestor.reverifyOffer(source, offer.externalSku, offer.originalUrl);

      // Política de divergência: se esgotou ou preço mudou, aborta e devolve para OPEN.
      if (!latestOfferData || latestOfferData.priceCurrent !== offer.priceCurrent) {
        console.warn(`[Dispatch] Divergência detectada para a oferta ${offerId}. Preço atual: ${latestOfferData?.priceCurrent ?? 'Esgotado'}. Abortando disparo.`);

        const updatedOffer = await OfferModel.findByIdAndUpdate(
          offerId,
          {
            $set: {
              status: OfferStatus.OPEN,
              priceCurrent: latestOfferData?.priceCurrent ?? offer.priceCurrent,
            },
            $unset: {
              operatorId: 1,
              scheduledFor: 1,
              selectedChannels: 1,
              resolvedAt: 1,
            },
          },
          { new: true }
        ).lean();

        if (updatedOffer) {
          // Atualizar o DispatchLog como ABORTED_DUE_TO_DIVERGENCE
          const channels = offer.selectedChannels ?? [];
          const abortStatus = channels.reduce((acc, ch) => ({ ...acc, [ch]: 'ABORTED_DUE_TO_DIVERGENCE' }), {});

          await DispatchLogModel.updateOne(
            { offerId },
            { $set: { deliveryStatus: abortStatus } }
          );

          // Emitir broadcast para retornar a oferta para a tela principal
          broadcastOfferStateChanged({
            offerId,
            status: updatedOffer.status,
            operatorId: '',
            operatorName: '',
            scheduledFor: null,
          });

          return { success: false, offerId, deliveryStatus: abortStatus, reason: 'Divergência de preço/disponibilidade' };
        }
      }
    }

    // 2. Disparo para os canais selecionados
    const deliveryStatus: Record<string, string> = {};
    const { ChannelModel } = await import('../../database/models/index.js');
    const { dispatchToWhatsApp } = await import('../channels/drivers/whatsapp/whatsappDriver.js');
    const { dispatchToTelegram } = await import('../channels/drivers/telegram/telegramDriver.js');

    const selectedChannels = offer.selectedChannels || [];

    for (const channelKey of selectedChannels) {
      const channel = await ChannelModel.findOne({ key: channelKey });
      
      if (!channel) {
        deliveryStatus[channelKey] = 'CHANNEL_NOT_FOUND';
        continue;
      }
      
      if (!channel.active) {
        deliveryStatus[channelKey] = 'CHANNEL_INACTIVE';
        continue;
      }

      try {
        if (channel.key === 'whatsapp') {
          const res = await dispatchToWhatsApp(channel, offer as any);
          deliveryStatus[channelKey] = res.success ? 'DELIVERED' : `ERROR: ${res.error}`;
        } else if (channel.key === 'telegram') {
          const res = await dispatchToTelegram(channel, offer as any);
          deliveryStatus[channelKey] = res.success ? 'DELIVERED' : `ERROR: ${res.error}`;
        } else {
          // Outros drivers ainda não implementados
          deliveryStatus[channelKey] = 'DRIVER_NOT_IMPLEMENTED';
        }
      } catch (err: any) {
        console.error(`[Dispatch] Falha ao despachar oferta ${offerId} para canal ${channelKey}:`, err);
        deliveryStatus[channelKey] = `ERROR: ${err.message}`;
      }
    }

    // Atualizamos o DispatchLog com o status da entrega.
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
