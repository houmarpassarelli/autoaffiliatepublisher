// apps/api/src/modules/channels/channelMapper.ts
import type { AdminChannelDto, ChannelDto, ChannelMode, CopyFormat } from '@aap/shared';
import type { Types } from 'mongoose';
import { toCredentialKeys, type StoredCredentials } from '../../database/credentials.js';
import type { ChannelAttributes } from '../../database/models/index.js';

/** Forma mínima consumida pelo mapeador — serve ao documento hidratado e ao `lean()`. */
export type MappableChannel = Omit<ChannelAttributes, 'credentials'> & {
  _id: Types.ObjectId;
  credentials?: StoredCredentials;
};

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

/**
 * Converte o canal persistido no DTO do Dashboard Administrativo.
 *
 * Acrescenta ao DTO comum apenas os **nomes** das credenciais cadastradas, para
 * que o painel possa mostrar o que já está configurado sem nunca exibir um
 * token. Os valores continuam sem sair do servidor.
 *
 * A existência de dois mapeadores é deliberada e não é duplicação: o dashboard
 * remoto é Thin Client e não deve sequer saber quais credenciais existem.
 */
export function toAdminChannelDto(channel: MappableChannel): AdminChannelDto {
  return {
    ...toChannelDto(channel),
    credentialKeys: toCredentialKeys(channel.credentials),
  };
}
