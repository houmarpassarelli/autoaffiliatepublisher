// packages/shared/src/enums/offerStatus.ts

/**
 * Estados do ciclo de vida da oferta.
 * Regras de transição documentadas em FLUXO_OPERACIONAL.md, Seção 2.
 */
export enum OfferStatus {
  OPEN = 'OPEN', // Aguardando decisão do operador
  SCHEDULED = 'SCHEDULED', // Aprovada, aguardando o delay anti-spam na fila
  COMPLETED = 'COMPLETED', // Disparada, ou marcada como publicada via clipboard
  DISCARDED = 'DISCARDED', // Rejeitada — alimenta o histórico anti-recaptura
}
