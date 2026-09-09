// apps/api/src/database/models/offerModel.ts
import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { OfferStatus } from '@aap/shared';

/**
 * Registro pontual de preço, usado para saber se o item está de fato no menor
 * preço do período recente (insumo da decisão editorial do operador).
 */
export interface PriceHistoryEntryAttributes {
  price: number;
  capturedAt: Date;
}

/**
 * Variantes de copy geradas pela IA, indexadas pela chave de formato do canal
 * (`messaging`, `social`, `article`).
 */
export type AiCopyAttributes = Record<string, string>;

/**
 * Oferta coletada, enriquecida pela IA e submetida à curadoria humana.
 * O campo `status` é a máquina de estados descrita em FLUXO_OPERACIONAL.md, Seção 2.
 */
export interface OfferAttributes {
  sourceId: Types.ObjectId; // Referência à fonte que originou a oferta
  externalSku: string; // ID do produto na loja de origem
  dedupeHash: string; // Hash SHA-256 da URL canônica — chave de deduplicação
  title: string; // Título original do produto
  originalUrl: string; // URL do produto na loja
  affiliateUrl: string; // URL convertida com a tag de afiliado
  imageUrl: string; // Imagem do produto
  priceOriginal: number; // Preço "de"
  priceCurrent: number; // Preço "por"
  discountPct: number; // Desconto percentual calculado na ingestão
  priceHistory: PriceHistoryEntryAttributes[]; // Histórico de preços do item
  aiCopy: AiCopyAttributes; // Copy por formato de canal
  status: OfferStatus;
  operatorId: Types.ObjectId | null; // Preenchido no momento da ação resolutiva
  selectedChannels: string[]; // Canais escolhidos pelo operador no disparo
  scheduledFor: Date | null; // Horário previsto de disparo (status SCHEDULED)
  createdAt: Date; // Data de resgate — base da ordenação decrescente
  resolvedAt: Date | null; // Momento da ação resolutiva do operador
}

export type OfferDocument = HydratedDocument<OfferAttributes>;

// Subdocumento sem _id próprio: é uma série temporal simples, não uma entidade.
const priceHistoryEntrySchema = new Schema<PriceHistoryEntryAttributes>(
  {
    price: { type: Number, required: true, min: 0 },
    capturedAt: { type: Date, required: true },
  },
  { _id: false },
);

const offerSchema = new Schema<OfferAttributes>(
  {
    sourceId: { type: Schema.Types.ObjectId, ref: 'Source', required: true },
    externalSku: { type: String, required: true, trim: true },
    dedupeHash: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    originalUrl: { type: String, required: true, trim: true },
    affiliateUrl: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true, trim: true },
    priceOriginal: { type: Number, required: true, min: 0 },
    priceCurrent: { type: Number, required: true, min: 0 },
    discountPct: { type: Number, required: true, min: 0, max: 100 },
    priceHistory: { type: [priceHistoryEntrySchema], default: [] },
    aiCopy: { type: Map, of: String, default: () => new Map<string, string>() },
    status: {
      type: String,
      required: true,
      enum: Object.values(OfferStatus),
      default: OfferStatus.OPEN,
    },
    operatorId: { type: Schema.Types.ObjectId, ref: 'Operator', default: null },
    selectedChannels: { type: [String], default: [] },
    scheduledFor: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
  },
  {
    collection: 'offers',
    // updatedAt é desnecessário: a cronologia relevante da oferta é dada por
    // createdAt (resgate) e resolvedAt (ação do operador).
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// --- Índices obrigatórios (ESPECS_TECNICAS.md, Seção 2.2) ---

// Listagem das abas do dashboard remoto, com ordenação decrescente por data de resgate.
offerSchema.index({ status: 1, createdAt: -1 });

// Deduplicação primária: impede a recaptura do mesmo produto em qualquer estado,
// inclusive DISCARDED — que funciona como lista de bloqueio permanente.
offerSchema.index({ dedupeHash: 1 }, { unique: true });

// Deduplicação secundária por SKU dentro da mesma fonte.
offerSchema.index({ externalSku: 1, sourceId: 1 });

// Consulta de auditoria por operador.
offerSchema.index({ operatorId: 1, resolvedAt: -1 });

// --- Índice de apoio ao agendamento ---

// Horizonte da fila de disparo: a oferta com o instante de disparo mais distante
// já reservado. É a consulta que decide se o próximo clique dispara de imediato
// ou entra escalonado (ESPECS_TECNICAS.md, Seção 7).
offerSchema.index({ scheduledFor: -1 });

export const OfferModel: Model<OfferAttributes> = model<OfferAttributes>('Offer', offerSchema);
