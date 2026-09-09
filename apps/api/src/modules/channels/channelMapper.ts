// apps/api/src/modules/channels/channelMapper.ts
import type { ChannelDto, ChannelMode, CopyFormat } from '@aap/shared';
import type { Types } from 'mongoose';
import type { ChannelAttributes } from '../../database/models/index.js';

/** Forma mínima consumida pelo mapeador — serve ao documento hidratado e ao `lean()`. */
export type MappableChannel = ChannelAttributes & { _id: Types.ObjectId };

/**
 * Converte o canal persistido no DTO que trafega para os dashboards.
 *
 * O campo `credentials` é omitido deliberadamente, e não por esquecimento: os
 * tokens de envio nunca saem da máquina administrativa, que é o único ponto de
 * execução real dos disparos (ARQUITETURA.md, Seção 6 — Thin Client). O DTO
 * compartilhado sequer declara o campo, de modo que a regra é sustentada pelo
 * tipo, e não pela disciplina de quem escreve a rota.
 */
export function toChannelDto(channel: MappableChannel): ChannelDto {
  return {
    id: channel._id.toString(),
    key: channel.key,
    label: channel.label,
    mode: channel.mode as ChannelMode,
    copyFormatKey: channel.copyFormatKey as CopyFormat,
    active: channel.active,
    createdAt: channel.createdAt.toISOString(),
    updatedAt: channel.updatedAt.toISOString(),
  };
}
