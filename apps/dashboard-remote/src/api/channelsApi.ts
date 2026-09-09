// apps/dashboard-remote/src/api/channelsApi.ts
import { channelListResponseSchema, type ChannelDto } from '@aap/shared';
import { apiRequest } from './httpClient.js';

/** Canais ativos que alimentam o seletor multicanal de cada card. */
export async function fetchActiveChannels(): Promise<ChannelDto[]> {
  const { channels } = await apiRequest('/api/channels', channelListResponseSchema);

  return channels;
}
