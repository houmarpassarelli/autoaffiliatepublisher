// packages/shared/src/enums/dispatchActionType.ts

/**
 * Natureza da ação resolutiva registrada na auditoria.
 * Ambas têm o mesmo peso: removem o item da fila global de todos os operadores
 * (FLUXO_OPERACIONAL.md, Seção 5 — "Copiar" vale como "Publicar").
 */
export enum DispatchActionType {
  PUBLISHED_API = 'PUBLISHED_API', // Disparo automatizado por driver
  COPIED_CLIPBOARD = 'COPIED_CLIPBOARD', // Publicação assistida via área de transferência
}
