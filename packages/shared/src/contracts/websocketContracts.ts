// packages/shared/src/contracts/websocketContracts.ts
import { z } from 'zod';
import { objectIdSchema } from '../schemas/commonSchemas.js';
import type { ChannelDto } from '../schemas/channelSchemas.js';
import type { DeliveryStatus } from '../schemas/dispatchLogSchemas.js';
import type { OfferDto } from '../schemas/offerSchemas.js';
import type { OfferStatus } from '../enums/index.js';

/**
 * Catálogo de eventos de broadcast emitidos pelo servidor.
 * O WebSocket é a camada de experiência (o card aparece ou some das telas em
 * milissegundos); a camada de correção contra concorrência é a escrita
 * condicional no MongoDB (ESPECS_TECNICAS.md, Seções 3.1 e 6).
 */
export enum ServerEventType {
  OFFER_CREATED = 'OFFER_CREATED', // Worker de ingestão finalizou um lote
  OFFER_STATE_CHANGED = 'OFFER_STATE_CHANGED', // Operador executou ação resolutiva
  OFFER_PUBLISHED = 'OFFER_PUBLISHED', // A fila processou um agendamento
  OPERATOR_CONNECTED = 'OPERATOR_CONNECTED', // Operador entrou pela tela-portão
  OPERATOR_DISCONNECTED = 'OPERATOR_DISCONNECTED', // Socket encerrou
  CHANNELS_UPDATED = 'CHANNELS_UPDATED', // CRUD de canais no painel administrativo
}

/** Ofertas novas, inseridas no topo da aba Abertas de todos os clientes. */
export interface OfferCreatedEvent {
  event: ServerEventType.OFFER_CREATED;
  offers: OfferDto[];
}

/** Remove o card da aba Abertas em todas as telas conectadas. */
export interface OfferStateChangedEvent {
  event: ServerEventType.OFFER_STATE_CHANGED;
  offerId: string;
  status: OfferStatus;
  operatorId: string;
  operatorName: string;
  scheduledFor: string | null;
}

/** Move o card de Agendadas para Concluídas. */
export interface OfferPublishedEvent {
  event: ServerEventType.OFFER_PUBLISHED;
  offerId: string;
  deliveryStatus: DeliveryStatus;
}

/** Desabilita o nome nas telas de entrada dos demais operadores. */
export interface OperatorConnectedEvent {
  event: ServerEventType.OPERATOR_CONNECTED;
  operatorId: string;
  name: string;
}

/** Libera o nome instantaneamente na tela-portão. */
export interface OperatorDisconnectedEvent {
  event: ServerEventType.OPERATOR_DISCONNECTED;
  operatorId: string;
}

/** Atualiza os checkboxes de canais dos cards em tempo real. */
export interface ChannelsUpdatedEvent {
  event: ServerEventType.CHANNELS_UPDATED;
  channels: ChannelDto[];
}

export type ServerEvent =
  | OfferCreatedEvent
  | OfferStateChangedEvent
  | OfferPublishedEvent
  | OperatorConnectedEvent
  | OperatorDisconnectedEvent
  | ChannelsUpdatedEvent;

/**
 * Mensagens enviadas pelo cliente. A presença é derivada do socket vivo; o
 * heartbeat com expiração é o mecanismo previsto para reconciliar presenças
 * órfãs de conexões caídas sem `close` limpo (ESPECS_TECNICAS.md, Seção 3.2).
 */
export enum ClientMessageType {
  OPERATOR_CLAIM = 'OPERATOR_CLAIM', // Reivindicar identidade na tela-portão
  HEARTBEAT = 'HEARTBEAT', // Manter a presença ativa
}

export interface OperatorClaimMessage {
  type: ClientMessageType.OPERATOR_CLAIM;
  operatorId: string;
}

export interface HeartbeatMessage {
  type: ClientMessageType.HEARTBEAT;
}

export type ClientMessage = OperatorClaimMessage | HeartbeatMessage;

/**
 * Validação em tempo de execução das mensagens recebidas pelo socket.
 * Diferente dos eventos de servidor, que a própria aplicação produz, o que chega
 * do cliente é entrada não confiável e precisa ser validada antes de tocar o
 * registro de presença.
 */
export const clientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(ClientMessageType.OPERATOR_CLAIM),
    operatorId: objectIdSchema,
  }),
  z.object({
    type: z.literal(ClientMessageType.HEARTBEAT),
  }),
]);

/** Recusa da reivindicação: o nome já está em uso por outro operador conectado. */
export const OPERATOR_IN_USE = 'OPERATOR_IN_USE' as const;

/** Recusa da reivindicação: o operador não existe ou está desativado no cadastro. */
export const OPERATOR_UNAVAILABLE = 'OPERATOR_UNAVAILABLE' as const;

export type OperatorClaimRejectionReason = typeof OPERATOR_IN_USE | typeof OPERATOR_UNAVAILABLE;

/**
 * Respostas ponto a ponto ao `OPERATOR_CLAIM` — enviadas apenas ao socket que
 * reivindicou a identidade, nunca em broadcast. O ESPECS_TECNICAS.md descreve
 * esta resposta como "aceite ou OPERATOR_IN_USE"; aqui ela ganha forma tipada.
 */
export enum ServerReplyType {
  OPERATOR_CLAIM_ACCEPTED = 'OPERATOR_CLAIM_ACCEPTED',
  OPERATOR_CLAIM_REJECTED = 'OPERATOR_CLAIM_REJECTED',
}

/** Identidade concedida: a partir daqui o socket representa aquele operador. */
export interface OperatorClaimAcceptedReply {
  reply: ServerReplyType.OPERATOR_CLAIM_ACCEPTED;
  operatorId: string;
  name: string;
}

/** Identidade negada: a tela-portão deve manter o operador na seleção. */
export interface OperatorClaimRejectedReply {
  reply: ServerReplyType.OPERATOR_CLAIM_REJECTED;
  operatorId: string;
  reason: OperatorClaimRejectionReason;
}

export type ServerReply = OperatorClaimAcceptedReply | OperatorClaimRejectedReply;

/** Mensagem trafegada do servidor para o cliente: broadcast de estado ou resposta direta. */
export type ServerOutboundMessage = ServerEvent | ServerReply;
