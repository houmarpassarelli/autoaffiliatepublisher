// apps/api/src/database/models/operatorModel.ts
import { Schema, model, type HydratedDocument, type Model } from 'mongoose';

/**
 * Operador responsável pela curadoria no Dashboard Remoto.
 *
 * Nota de segurança: não existe senha, token ou fluxo de autenticação. A
 * identificação serve exclusivamente para atribuição de autoria no
 * comissionamento futuro, não para controle de acesso — o dashboard remoto deve
 * ficar restrito a rede confiável (ESPECS_TECNICAS.md, Seção 2.3).
 */
export interface OperatorAttributes {
  name: string; // Obrigatório — exibido na tela-portão de seleção
  email: string | null; // Opcional — apenas referência de contato
  active: boolean; // Operador habilitado a aparecer na seleção
  isOnline: boolean; // Controlado pela conexão WebSocket (presença ativa)
  lastSeenAt: Date | null; // Último heartbeat recebido — base da reconciliação de presença órfã
  createdAt: Date;
  updatedAt: Date;
}

export type OperatorDocument = HydratedDocument<OperatorAttributes>;

const operatorSchema = new Schema<OperatorAttributes>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, default: null, trim: true, lowercase: true },
    active: { type: Boolean, required: true, default: true },

    // A presença é derivada do socket vivo. Uma queda sem `close` limpo pode deixar
    // este campo em true de forma órfã; a reconciliação por expiração de heartbeat
    // é tarefa prevista no CHECKLIST.md, Categoria 8.
    isOnline: { type: Boolean, required: true, default: false },
    lastSeenAt: { type: Date, default: null },
  },
  {
    collection: 'operators',
    timestamps: true,
  },
);

// O nome é o identificador visível na tela-portão: dois operadores homônimos
// tornariam a seleção ambígua e corromperiam a autoria na auditoria.
operatorSchema.index({ name: 1 }, { unique: true });

// Carga da tela-portão: apenas operadores ativos são listados.
operatorSchema.index({ active: 1 });

export const OperatorModel: Model<OperatorAttributes> = model<OperatorAttributes>(
  'Operator',
  operatorSchema,
);
