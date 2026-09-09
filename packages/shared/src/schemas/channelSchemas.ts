// packages/shared/src/schemas/channelSchemas.ts
import { z } from 'zod';
import { ChannelMode, CopyFormat } from '../enums/index.js';
import { isoDateSchema, objectIdSchema } from './commonSchemas.js';

/**
 * Canal de destino trafegado para os dashboards.
 * As credenciais de envio nunca acompanham o DTO: elas permanecem na máquina
 * administrativa, que é o único ponto de execução real dos disparos.
 */
export const channelDtoSchema = z.object({
  id: objectIdSchema,
  key: z.string(), // Chave estável usada nos payloads (ex.: 'telegram')
  label: z.string(), // Nome exibido no checkbox do card
  mode: z.enum(ChannelMode),
  copyFormatKey: z.enum(CopyFormat), // Qual variante de aiCopy este canal consome
  active: z.boolean(), // Desativar oculta o canal do dashboard remoto
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export type ChannelDto = z.infer<typeof channelDtoSchema>;

/**
 * Carga dos checkboxes do seletor multicanal do card.
 * O mesmo formato é reaproveitado pelo evento CHANNELS_UPDATED, para que a
 * atualização em tempo real substitua a lista sem conversão intermediária.
 */
export const channelListResponseSchema = z.object({
  channels: z.array(channelDtoSchema),
});

export type ChannelListResponse = z.infer<typeof channelListResponseSchema>;
