// apps/api/src/modules/channels/channelService.ts
import type { AdminChannelDto, ChannelCreateInput, ChannelUpdateInput } from '@aap/shared';
import { applyCredentialsPatch } from '../../database/credentials.js';
import { ChannelModel, DispatchLogModel, OfferModel } from '../../database/models/index.js';
import { ConflictError, NotFoundError } from '../../server/errors.js';
import { withUniqueConstraint } from '../../server/mongoErrors.js';
import { broadcastChannelsUpdated } from '../websocket/index.js';
import { toAdminChannelDto, toChannelDto, type MappableChannel } from './channelMapper.js';

/**
 * Cadastro dos canais de destino.
 *
 * Este é o único CRUD do painel administrativo com efeito imediato no dashboard
 * remoto: os checkboxes do seletor multicanal são exatamente a lista mantida
 * aqui (`FLUXO_OPERACIONAL.md`, Seção 6). Toda escrita, portanto, termina em
 * broadcast — sem ele, o operador continuaria vendo canais que não existem mais
 * ou deixaria de ver um canal recém-criado até recarregar a página.
 */

/** Rótulos, já com artigo, usados na mensagem de chave duplicada. */
const CHANNEL_FIELD_LABELS = { key: 'esta chave' } as const;

/** Localiza o canal ou recusa a operação. */
async function requireChannel(channelId: string): Promise<InstanceType<typeof ChannelModel>> {
  const channel = await ChannelModel.findById(channelId);

  if (!channel) {
    throw new NotFoundError('Canal de destino não encontrado.');
  }

  return channel;
}

/**
 * Anuncia a lista de canais a todas as telas conectadas.
 *
 * O broadcast leva o DTO **comum**, e não o administrativo: o evento é
 * consumido pelo dashboard remoto, que é Thin Client e não recebe nem os nomes
 * das credenciais. Enviar a lista completa, e não um delta, é o que permite ao
 * cliente substituir o estado inteiro sem reconciliação — foi assim que
 * `useChannels` já foi escrito.
 */
async function announceChannels(): Promise<void> {
  const channels = await ChannelModel.find().sort({ label: 1 }).lean<MappableChannel[]>();

  broadcastChannelsUpdated(channels.map(toChannelDto));
}

/**
 * Listagem do painel administrativo — inclui os canais desativados, que o
 * dashboard remoto não enxerga por não serem destino elegível.
 */
export async function listChannelsForAdmin(): Promise<AdminChannelDto[]> {
  const channels = await ChannelModel.find().sort({ label: 1 }).lean<MappableChannel[]>();

  return channels.map(toAdminChannelDto);
}

/** Cadastro de um canal novo. */
export async function createChannel(input: ChannelCreateInput): Promise<AdminChannelDto> {
  const channel = new ChannelModel({
    key: input.key,
    label: input.label,
    mode: input.mode,
    credentials: applyCredentialsPatch(undefined, input.credentials),
    copyFormatKey: input.copyFormatKey,
    active: input.active,
  });

  await withUniqueConstraint(() => channel.save(), CHANNEL_FIELD_LABELS);
  await announceChannels();

  return toAdminChannelDto(channel);
}

/**
 * Edição de um canal existente.
 *
 * A `key` não é editável e por isso não chega no corpo: ela já está gravada nas
 * linhas de `dispatch_logs` e nos `selectedChannels` das ofertas agendadas.
 * Renomeá-la romperia o vínculo com a auditoria, que é insumo do comissionamento.
 */
export async function updateChannel(
  channelId: string,
  input: ChannelUpdateInput,
): Promise<AdminChannelDto> {
  const channel = await requireChannel(channelId);

  channel.label = input.label;
  channel.mode = input.mode;
  channel.copyFormatKey = input.copyFormatKey;
  channel.active = input.active;
  channel.credentials = applyCredentialsPatch(channel.credentials, input.credentials);

  await withUniqueConstraint(() => channel.save(), CHANNEL_FIELD_LABELS);
  await announceChannels();

  return toAdminChannelDto(channel);
}

/**
 * Exclusão de um canal.
 *
 * Recusada enquanto a chave aparecer numa oferta ou num log de disparo. O
 * vínculo é pela chave desnormalizada: a linha de auditoria sobrevive à
 * exclusão, mas a aba Agendadas perde o rótulo e passa a exibir a chave crua,
 * que é identificador de payload e não o nome pelo qual o operador conhece o
 * destino. Desativar oculta o canal do dashboard remoto preservando os dois.
 */
export async function deleteChannel(channelId: string): Promise<void> {
  const channel = await requireChannel(channelId);

  const [linkedOffers, linkedLogs] = await Promise.all([
    OfferModel.countDocuments({ selectedChannels: channel.key }),
    DispatchLogModel.countDocuments({ channels: channel.key }),
  ]);

  if (linkedOffers > 0 || linkedLogs > 0) {
    throw new ConflictError(
      `Este canal já foi usado em ${String(linkedOffers)} oferta(s) e ${String(linkedLogs)} disparo(s) e não pode ser excluído. Desative-o para removê-lo do dashboard remoto sem perder a auditoria.`,
    );
  }

  await ChannelModel.deleteOne({ _id: channelId });
  await announceChannels();
}
