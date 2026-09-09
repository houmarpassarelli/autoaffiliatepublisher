// apps/api/src/modules/channels/channelRoutes.ts
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { channelListResponseSchema } from '@aap/shared';
import { ChannelModel } from '../../database/models/index.js';
import { toChannelDto, type MappableChannel } from './channelMapper.js';

/**
 * Leitura dos canais de destino.
 *
 * Escopo intencionalmente restrito: apenas a carga que o seletor multicanal do
 * card precisa. O CRUD completo do painel administrativo — com credenciais e
 * broadcast de `CHANNELS_UPDATED` — é item próprio do CHECKLIST.md, Categoria 4.
 */
export const channelRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/api/channels',
    { schema: { response: { 200: channelListResponseSchema } } },
    async () => {
      // Canal desativado some do dashboard remoto: não é destino elegível.
      const channels = await ChannelModel.find({ active: true })
        .sort({ label: 1 })
        .lean<MappableChannel[]>();

      return { channels: channels.map(toChannelDto) };
    },
  );
};
