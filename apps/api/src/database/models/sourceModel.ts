// apps/api/src/database/models/sourceModel.ts
import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { SourceType } from '@aap/shared';

/**
 * Fonte de coleta de ofertas: uma API oficial de afiliados, um feed de rede
 * ou uma página de ofertas raspada. Concentra tudo que é específico da loja —
 * credenciais, tag de afiliado, ritmo de varredura e o prompt da IA.
 */
export interface SourceAttributes {
  name: string; // Nome da loja/plataforma exibido no painel
  type: SourceType; // Mecanismo de coleta
  url: string; // Endpoint da API, URL do feed ou página de ofertas
  credentials: Map<string, string>; // Chaves e tokens — criptografia pendente (ver nota abaixo)
  affiliateTag: string; // Tag/ID de afiliado usada na conversão de link
  cronExpression: string; // Intervalo de varredura (ex.: '0 * * * *')
  aiPromptTemplate: string; // Instrução específica de como a IA reescreve esta fonte
  active: boolean; // Fonte habilitada para varredura
  complianceVerified: boolean; // Confirmação de leitura das regras de compliance
  lastRunAt: Date | null; // Última execução bem-sucedida da coleta
  createdAt: Date;
  updatedAt: Date;
}

export type SourceDocument = HydratedDocument<SourceAttributes>;
export type SourceId = Types.ObjectId;

const sourceSchema = new Schema<SourceAttributes>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: Object.values(SourceType) },
    url: { type: String, required: true, trim: true },

    // Nota de segurança: os valores são gravados como recebidos. A definição do
    // método de criptografia em repouso é decisão em aberto (CHECKLIST.md,
    // Categoria 8) e será aplicada nesta camada, sem alterar o contrato do model.
    credentials: { type: Map, of: String, default: () => new Map<string, string>() },

    affiliateTag: { type: String, required: true, trim: true },
    cronExpression: { type: String, required: true, trim: true },
    aiPromptTemplate: { type: String, required: true },
    active: { type: Boolean, required: true, default: true },
    complianceVerified: { type: Boolean, required: true, default: false },
    lastRunAt: { type: Date, default: null },
  },
  {
    collection: 'sources',
    timestamps: true, // Alimenta createdAt e updatedAt automaticamente
  },
);

// Consulta do scheduler na inicialização: apenas as fontes habilitadas entram no cron.
sourceSchema.index({ active: 1 });

// O nome da fonte é a identificação usada nos filtros de auditoria — mantido único.
sourceSchema.index({ name: 1 }, { unique: true });

export const SourceModel: Model<SourceAttributes> = model<SourceAttributes>('Source', sourceSchema);
