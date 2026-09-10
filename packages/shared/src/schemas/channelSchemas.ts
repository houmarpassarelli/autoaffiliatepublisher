// packages/shared/src/schemas/channelSchemas.ts
import { z } from 'zod';
import { ChannelMode, CopyFormat } from '../enums/index.js';
import { credentialsPatchSchema, isoDateSchema, objectIdSchema } from './commonSchemas.js';

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

/**
 * Canal como o Dashboard Administrativo o consome.
 *
 * Estende o DTO do dashboard remoto com os **nomes** das credenciais
 * cadastradas — nunca os valores. A assimetria entre os dois DTOs é
 * deliberada e segue o precedente de `operatorDtoSchema` e
 * `availableOperatorDtoSchema`: cada painel recebe exatamente o que a sua tela
 * precisa, e o que o remoto não recebe ele não pode vazar.
 */
export const adminChannelDtoSchema = channelDtoSchema.extend({
  credentialKeys: z.array(z.string()), // Nomes das credenciais de envio cadastradas
});

export type AdminChannelDto = z.infer<typeof adminChannelDtoSchema>;

/** Listagem do painel administrativo — inclui os canais desativados. */
export const adminChannelListResponseSchema = z.object({
  channels: z.array(adminChannelDtoSchema),
});

export type AdminChannelListResponse = z.infer<typeof adminChannelListResponseSchema>;

/**
 * Campos editáveis de um canal, comuns à criação e à edição.
 * `credentials` fica de fora pelo mesmo motivo das fontes: é merge patch.
 */
const channelWritableFieldsSchema = z.object({
  label: z.string().trim().min(1, 'Informe o nome exibido no checkbox do card.'),
  mode: z.enum(ChannelMode), // AUTOMATED (driver publica) ou ASSISTED (operador cola)
  copyFormatKey: z.enum(CopyFormat), // Qual variante de aiCopy o driver deste canal consome
  active: z.boolean(), // Desativar oculta o canal do dashboard remoto
});

/**
 * Cadastro de um canal novo.
 *
 * A `key` só existe aqui e não reaparece na edição: ela é o identificador do
 * canal dentro dos payloads de disparo e das linhas já gravadas em
 * `dispatch_logs`. Renomeá-la depois romperia o vínculo com a auditoria, que é
 * insumo do comissionamento — por isso é imutável após a criação.
 */
export const channelCreateSchema = channelWritableFieldsSchema.extend({
  key: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9][a-z0-9-]*$/,
      'A chave aceita apenas letras minúsculas, números e hífen (ex.: "telegram").',
    ),
  credentials: credentialsPatchSchema.optional(),
});

export type ChannelCreateInput = z.infer<typeof channelCreateSchema>;

/** Edição de um canal existente. A chave permanece imutável. */
export const channelUpdateSchema = channelWritableFieldsSchema.extend({
  credentials: credentialsPatchSchema.optional(),
});

export type ChannelUpdateInput = z.infer<typeof channelUpdateSchema>;
