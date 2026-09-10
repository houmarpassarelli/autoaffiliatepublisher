// packages/shared/src/index.ts
// Ponto de entrada único do contrato compartilhado entre o backend (@aap/api)
// e os dois dashboards. Nenhum tipo de domínio deve ser duplicado nas pontas.

export * from './enums/index.js';
export * from './schemas/index.js';
export * from './contracts/index.js';
export * from './utils/index.js';
