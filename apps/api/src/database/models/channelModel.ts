// apps/api/src/database/models/channelModel.ts
import { Schema, model, type HydratedDocument, type Model } from 'mongoose';
import { ChannelMode, CopyFormat } from '@aap/shared';

/**
 * Canal de destino da publicação, cadastrado dinamicamente no Dashboard
 * Administrativo. Qualquer alteração aqui reflete imediatamente nos checkboxes
 * dos cards do Dashboard Remoto, via broadcast CHANNELS_UPDATED.
 */
export interface ChannelAttributes {
  key: string; // Chave estável usada nos payloads (ex.: 'telegram')
  label: string; // Nome exibido no checkbox do card
  mode: ChannelMode; // AUTOMATED (driver publica) ou ASSISTED (operador cola manualmente)
  credentials: Record<string, string>; // Tokens de envio — nunca trafegam ao cliente remoto
  copyFormatKey: CopyFormat; // Qual variante de aiCopy este canal consome
  active: boolean; // Desativar oculta o canal do dashboard remoto
  createdAt: Date;
  updatedAt: Date;
}

export type ChannelDocument = HydratedDocument<ChannelAttributes>;

const channelSchema = new Schema<ChannelAttributes>(
  {
    key: { type: String, required: true, trim: true, lowercase: true },
    label: { type: String, required: true, trim: true },
    mode: { type: String, required: true, enum: Object.values(ChannelMode) },

    // Mesma nota do model de fontes: a criptografia em repouso é decisão em aberto
    // e será aplicada nesta camada, sem alterar o contrato do model.
    credentials: { type: Map, of: String, default: () => new Map<string, string>() },

    copyFormatKey: {
      type: String,
      required: true,
      enum: Object.values(CopyFormat),
      default: CopyFormat.MESSAGING,
    },
    active: { type: Boolean, required: true, default: true },
  },
  {
    collection: 'channels',
    timestamps: true,
  },
);

// A chave é o identificador do canal dentro dos payloads de disparo e dos logs
// de auditoria — precisa ser estável e única.
channelSchema.index({ key: 1 }, { unique: true });

// Carga dos checkboxes do dashboard remoto: apenas canais ativos.
channelSchema.index({ active: 1 });

export const ChannelModel: Model<ChannelAttributes> = model<ChannelAttributes>(
  'Channel',
  channelSchema,
);
