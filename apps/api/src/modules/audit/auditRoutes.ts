// apps/api/src/modules/audit/auditRoutes.ts
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  auditFilterOptionsResponseSchema,
  dispatchLogListQuerySchema,
  dispatchLogListResponseSchema,
} from '@aap/shared';
import { buildExportFilename, toCsv } from './auditCsv.js';
import {
  listAuditFilterOptions,
  listDispatchLogs,
  listDispatchLogsForExport,
} from './auditQueryService.js';

/**
 * Painel de Auditoria de Disparos (`ESPECS_TECNICAS.md`, Seção 9).
 *
 * Rotas exclusivamente de leitura: `dispatch_logs` é auditoria imutável, gravada
 * uma única vez pela ação resolutiva do operador e nunca reescrita. Não existe
 * aqui verbo de escrita algum, e é assim de propósito — a base é insumo direto
 * do comissionamento futuro.
 */
export const auditRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/api/logs',
    {
      schema: {
        querystring: dispatchLogListQuerySchema,
        response: { 200: dispatchLogListResponseSchema },
      },
    },
    async (request) => listDispatchLogs(request.query),
  );

  /**
   * Opções do filtro de loja, lidas dos próprios logs.
   *
   * Separada da listagem porque é carregada uma vez, na abertura da tela: incluí-la
   * em toda resposta paginada seria repetir a mesma lista a cada troca de página.
   */
  app.get(
    '/api/logs/filters',
    { schema: { response: { 200: auditFilterOptionsResponseSchema } } },
    async () => listAuditFilterOptions(),
  );

  /**
   * Exportação do recorte filtrado.
   *
   * Não declara schema de resposta porque não devolve JSON: o corpo é o arquivo,
   * e o `Content-Disposition` faz o navegador baixá-lo em vez de exibi-lo. Os
   * filtros valem integralmente — o que se exporta é o recorte que o
   * administrador está vendo, sem o corte da paginação.
   */
  app.get(
    '/api/logs/export',
    { schema: { querystring: dispatchLogListQuerySchema } },
    async (request, reply) => {
      const logs = await listDispatchLogsForExport(request.query);

      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="${buildExportFilename()}"`)
        .send(toCsv(logs));
    },
  );
};
