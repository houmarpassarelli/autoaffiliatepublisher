// apps/api/src/modules/channels/index.ts

export { channelRoutes } from './channelRoutes.js';
export { channelAdminRoutes } from './channelAdminRoutes.js';
export { toChannelDto, toAdminChannelDto } from './channelMapper.js';
export {
  createChannel,
  deleteChannel,
  listChannelsForAdmin,
  updateChannel,
} from './channelService.js';
