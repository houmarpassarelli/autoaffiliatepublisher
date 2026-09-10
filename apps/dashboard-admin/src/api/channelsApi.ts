// apps/dashboard-admin/src/api/channelsApi.ts
import {
  adminChannelDtoSchema,
  adminChannelListResponseSchema,
  type AdminChannelDto,
  type ChannelCreateInput,
  type ChannelUpdateInput,
} from '@aap/shared';
import { apiDelete, apiRequest, apiWrite, type AdminResourceApi } from '@aap/ui';

/**
 * CRUD de canais de destino.
 *
 * Consome `/api/channels`, o DTO administrativo — com os nomes das credenciais
 * e os canais desativados. A leitura do dashboard remoto é outra rota
 * (`/api/channels/active`), e devolve menos de propósito.
 */
export const channelsApi: AdminResourceApi<
  AdminChannelDto,
  ChannelCreateInput,
  ChannelUpdateInput
> = {
  list: async () => {
    const { channels } = await apiRequest('/api/channels', adminChannelListResponseSchema);

    return channels;
  },

  create: (input) => apiWrite('/api/channels', 'POST', input, adminChannelDtoSchema),

  update: (id, input) => apiWrite(`/api/channels/${id}`, 'PUT', input, adminChannelDtoSchema),

  remove: (id) => apiDelete(`/api/channels/${id}`),
};
