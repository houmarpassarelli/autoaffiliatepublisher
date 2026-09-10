// apps/api/src/modules/channels/channelRoutes.ts
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { channelListResponseSchema } from '@aap/shared';
import { ChannelModel } from '../../database/models/index.js';
import { toChannelDto, type MappableChannel } from './channelMapper.js';

/**
 * Leitura dos canais de destino consumida pelo Dashboard Remoto.
 *
 * Escopo intencionalmente restrito: apenas a carga que o seletor multicanal do
 * card precisa — canais ativos, sem qualquer traço de credencial.
 *
 * O caminho é `/api/channels/active`, e não `/api/channels`, porque a tabela de
 * rotas do `ESPECS_TECNICAS.md`, Seção 9, reserva `/api/channels` ao CRUD do
 * painel administrativo. O sufixo diz para quem é cada leitura, em vez de dois
 * públicos disputarem o mesmo caminho.
 */
export const channelRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/api/channels/active',
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
