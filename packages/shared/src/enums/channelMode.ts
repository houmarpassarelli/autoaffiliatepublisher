// packages/shared/src/enums/channelMode.ts

/**
 * Modo de execução do canal.
 * - AUTOMATED: driver publica sozinho via API oficial
 * - ASSISTED:  não há API viável — a ação é o "Copiar para Área de Transferência"
 */
export enum ChannelMode {
  AUTOMATED = 'AUTOMATED',
  ASSISTED = 'ASSISTED',
}
