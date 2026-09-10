// apps/dashboard-admin/src/api/auditApi.ts
import {
  auditFilterOptionsResponseSchema,
  dispatchLogListResponseSchema,
  type AuditFilterOptionsResponse,
  type DispatchLogListQuery,
  type DispatchLogListResponse,
} from '@aap/shared';
import { apiRequest } from '@aap/ui';

/**
 * Filtros da tela, como o formulário os mantém.
 *
 * Campo em branco significa "sem filtro" e não viaja na consulta — diferente do
 * schema do servidor, onde o parâmetro simplesmente não existe.
 */
export interface AuditFilters {
  from: string;
  to: string;
  operatorId: string;
  sourceName: string;
  channel: string;
}

export const EMPTY_AUDIT_FILTERS: AuditFilters = {
  from: '',
  to: '',
  operatorId: '',
  sourceName: '',
  channel: '',
};

/**
 * Converte os filtros da tela na consulta da URL.
 *
 * Campos vazios são omitidos: enviá-los como string vazia faria o servidor
 * recusar o `objectIdSchema` do operador e filtrar por loja de nome vazio.
 */
export function toSearchParams(
  filters: AuditFilters,
  pagination?: Pick<DispatchLogListQuery, 'page' | 'limit'>,
): URLSearchParams {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value.length > 0) {
      params.set(key, value);
    }
  }

  if (pagination) {
    params.set('page', String(pagination.page));
    params.set('limit', String(pagination.limit));
  }

  return params;
}

/** Página de logs de disparo, com os totais do recorte inteiro. */
export async function fetchDispatchLogs(
  filters: AuditFilters,
  pagination: Pick<DispatchLogListQuery, 'page' | 'limit'>,
): Promise<DispatchLogListResponse> {
  return apiRequest(
    `/api/logs?${toSearchParams(filters, pagination).toString()}`,
    dispatchLogListResponseSchema,
  );
}

/** Opções do filtro de loja, lidas dos próprios logs. */
export async function fetchAuditFilterOptions(): Promise<AuditFilterOptionsResponse> {
  return apiRequest('/api/logs/filters', auditFilterOptionsResponseSchema);
}

/**
 * Endereço do arquivo de exportação, com os filtros ativos.
 *
 * Devolve a URL em vez de baixar o arquivo por `fetch`: a exportação é servida
 * com `Content-Disposition: attachment`, e deixar o navegador navegar até ela é
 * o que faz o download acontecer com o nome de arquivo que o servidor definiu.
 */
export function buildExportUrl(filters: AuditFilters): string {
  return `/api/logs/export?${toSearchParams(filters).toString()}`;
}
