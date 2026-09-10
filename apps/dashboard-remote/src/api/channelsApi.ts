// apps/dashboard-remote/src/api/channelsApi.ts
import { channelListResponseSchema, type ChannelDto } from '@aap/shared';
import { apiRequest } from '@aap/ui';

/** Canais ativos que alimentam o seletor multicanal de cada card. */
export async function fetchActiveChannels(): Promise<ChannelDto[]> {
  const { channels } = await apiRequest('/api/channels/active', channelListResponseSchema);

  return channels;
}
