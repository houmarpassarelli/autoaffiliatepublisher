// apps/api/src/database/models/dispatchLogModel.ts
import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { DispatchActionType } from '@aap/shared';

/**
 * Registro de auditoria de toda ação resolutiva — publicação automatizada ou
 * cópia assistida. É a estrutura que viabiliza o comissionamento futuro: nasce
 * pronta desde o dia 1, mesmo sem o cálculo implementado (GERAL.md, Seção 3).
 */
export interface DispatchLogAttributes {
  offerId: Types.ObjectId;
  operatorId: Types.ObjectId;
  operatorName: string; // Desnormalizado — preserva a autoria mesmo se o operador for removido
  offerTitle: string; // Desnormalizado — evita join na listagem da auditoria
  sourceName: string; // Loja de origem, usada como filtro do painel
  actionType: DispatchActionType;
  channels: string[]; // Chaves dos canais alvo
  productSku: string; // Chave de cruzamento com os relatórios das plataformas
  affiliateUrl: string;
  priceAtDispatch: number; // Preço congelado no instante do disparo
  dispatchedAt: Date;
  deliveryStatus: Record<string, string>; // Resultado por canal (sucesso/erro)
}

export type DispatchLogDocument = HydratedDocument<DispatchLogAttributes>;

const dispatchLogSchema = new Schema<DispatchLogAttributes>(
  {
    offerId: { type: Schema.Types.ObjectId, ref: 'Offer', required: true },
    operatorId: { type: Schema.Types.ObjectId, ref: 'Operator', required: true },
    operatorName: { type: String, required: true, trim: true },
    offerTitle: { type: String, required: true, trim: true },
    sourceName: { type: String, required: true, trim: true },
    actionType: { type: String, required: true, enum: Object.values(DispatchActionType) },
    channels: { type: [String], required: true },
    productSku: { type: String, required: true, trim: true },
    affiliateUrl: { type: String, required: true, trim: true },
    priceAtDispatch: { type: Number, required: true, min: 0 },
    dispatchedAt: { type: Date, required: true, default: () => new Date() },

    // Preenchido pelo worker de disparo à medida que cada driver conclui.
    deliveryStatus: { type: Map, of: String, default: () => new Map<string, string>() },
  },
  {
    collection: 'dispatch_logs',
    // O log é imutável por natureza: gravado uma vez e nunca reescrito.
    timestamps: false,
  },
);

// --- Índices do Painel de Auditoria (FLUXO_OPERACIONAL.md, Seção 8) ---

// Listagem padrão: ordem cronológica decrescente.
dispatchLogSchema.index({ dispatchedAt: -1 });

// Filtro por operador — insumo direto do rateio de comissão.
dispatchLogSchema.index({ operatorId: 1, dispatchedAt: -1 });

// Cruzamento com os relatórios de venda das plataformas de afiliados.
dispatchLogSchema.index({ productSku: 1 });

// Filtro por loja de origem. Compostos com `dispatchedAt` porque a listagem é
// sempre ordenada por ele: sem o segundo campo, o filtro usaria o índice e a
// ordenação cairia em varredura.
dispatchLogSchema.index({ sourceName: 1, dispatchedAt: -1 });

// Filtro por canal de destino. `channels` é array — o MongoDB indexa cada
// elemento, de modo que a busca pela chave de um canal usa o índice.
dispatchLogSchema.index({ channels: 1, dispatchedAt: -1 });

export const DispatchLogModel: Model<DispatchLogAttributes> = model<DispatchLogAttributes>(
  'DispatchLog',
  dispatchLogSchema,
);
