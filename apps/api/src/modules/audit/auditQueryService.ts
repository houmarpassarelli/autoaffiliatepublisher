// apps/api/src/modules/audit/auditQueryService.ts
import type {
  AuditFilterOptionsResponse,
  DispatchLogListQuery,
  DispatchLogListResponse,
  DispatchLogTotals,
} from '@aap/shared';
import { Types, type QueryFilter } from 'mongoose';
import { DispatchLogModel, type DispatchLogAttributes } from '../../database/models/index.js';
import { toDispatchLogDto, type MappableDispatchLog } from './auditMapper.js';

/**
 * Consulta do Painel de Auditoria.
 *
 * A base é imutável e cresce indefinidamente: nada aqui escreve, e tudo pagina.
 * A ordenação é sempre decrescente por `dispatchedAt` e não é parametrizável —
 * uma trilha de auditoria se lê do mais recente para o mais antigo.
 */

/**
 * Converte um dia do calendário no instante correspondente, no fuso da máquina
 * administrativa.
 *
 * O fuso importa e a escolha é deliberada: interpretar `YYYY-MM-DD` em UTC
 * jogaria um disparo das 22h de um dia brasileiro para o dia seguinte no
 * filtro. O administrador escolhe um dia do calendário dele, e é esse dia que
 * o recorte precisa respeitar. `new Date(ano, mês, dia)` constrói no fuso local
 * do processo, que roda na mesma máquina.
 */
function toLocalDayBoundary(day: string, edge: 'start' | 'end'): Date {
  const [year, month, dayOfMonth] = day.split('-').map(Number) as [number, number, number];

  return edge === 'start'
    ? new Date(year, month - 1, dayOfMonth, 0, 0, 0, 0)
    : new Date(year, month - 1, dayOfMonth, 23, 59, 59, 999);
}

/**
 * Monta o filtro do MongoDB a partir dos parâmetros da tela.
 *
 * Os quatro filtros são de naturezas diferentes: `operatorId` é identidade,
 * `channel` casa contra um elemento do array de chaves, `sourceName` é o texto
 * congelado no instante do disparo, e o intervalo recorta dias do calendário.
 */
function buildFilter(query: DispatchLogListQuery): QueryFilter<DispatchLogAttributes> {
  const filter: QueryFilter<DispatchLogAttributes> = {};

  if (query.operatorId) {
    // O identificador precisa virar `ObjectId` aqui, e não só no `find`.
    // O Mongoose converte o texto pelo schema nas consultas comuns, mas o
    // pipeline de agregação é entregue cru ao MongoDB e não passa por essa
    // conversão: com o texto, a listagem acertaria e os totais viriam zerados.
    filter.operatorId = new Types.ObjectId(query.operatorId);
  }

  if (query.sourceName) {
    filter.sourceName = query.sourceName;
  }

  if (query.channel) {
    // O MongoDB casa o valor contra qualquer elemento do array.
    filter.channels = query.channel;
  }

  if (query.from || query.to) {
    filter.dispatchedAt = {
      ...(query.from ? { $gte: toLocalDayBoundary(query.from, 'start') } : {}),
      ...(query.to ? { $lte: toLocalDayBoundary(query.to, 'end') } : {}),
    };
  }

  return filter;
}

/**
 * Totais do recorte, numa única agregação.
 *
 * A contagem seria necessária de qualquer forma para a paginação; a soma sai da
 * mesma passagem. `totalValue` é soma de **preço de produto**, não de comissão —
 * o cálculo de comissão depende do cruzamento com os relatórios das plataformas
 * e é projeto futuro (MONETIZACAO.md, Seção 3).
 */
async function calculateTotals(
  filter: QueryFilter<DispatchLogAttributes>,
): Promise<DispatchLogTotals> {
  const [totals] = await DispatchLogModel.aggregate<DispatchLogTotals>([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalDispatches: { $sum: 1 },
        totalValue: { $sum: '$priceAtDispatch' },
      },
    },
    { $project: { _id: 0, totalDispatches: 1, totalValue: 1 } },
  ]);

  // Recorte sem nenhum resultado: a agregação não devolve documento algum.
  return totals ?? { totalDispatches: 0, totalValue: 0 };
}

/** Página de logs de disparo, com os totais do recorte inteiro. */
export async function listDispatchLogs(
  query: DispatchLogListQuery,
): Promise<DispatchLogListResponse> {
  const filter = buildFilter(query);

  const [logs, totals] = await Promise.all([
    DispatchLogModel.find(filter)
      .sort({ dispatchedAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean<MappableDispatchLog[]>(),
    calculateTotals(filter),
  ]);

  return {
    logs: logs.map(toDispatchLogDto),
    totals,
    page: query.page,
    limit: query.limit,
  };
}

/**
 * Opções do filtro de loja de origem.
 *
 * Vêm dos valores distintos da própria coleção, e não do cadastro de fontes: só
 * assim toda opção oferecida corresponde a algum log. Uma fonte cadastrada que
 * nunca originou disparo não tem o que filtrar, e uma fonte renomeada mantém os
 * logs antigos sob o nome antigo — que é o comportamento correto de uma trilha
 * imutável, e o motivo de o log guardar o nome em vez do identificador.
 */
export async function listAuditFilterOptions(): Promise<AuditFilterOptionsResponse> {
  const sourceNames = await DispatchLogModel.distinct('sourceName');

  return { sourceNames: sourceNames.sort((left, right) => left.localeCompare(right)) };
}

/**
 * Recorte completo para exportação, sem paginação.
 *
 * A exportação existe porque o rateio de comissão é um cruzamento entre esta
 * base e a planilha de vendas exportada da plataforma de afiliados
 * (MONETIZACAO.md, Seção 3.2). Sem ela, o cruzamento exigiria consulta direta ao
 * MongoDB.
 *
 * Deliberadamente ignora `page` e `limit`, e preserva todos os demais filtros: o
 * que se exporta é exatamente o recorte que o administrador está vendo, inteiro.
 */
export async function listDispatchLogsForExport(query: DispatchLogListQuery) {
  const logs = await DispatchLogModel.find(buildFilter(query))
    .sort({ dispatchedAt: -1 })
    .lean<MappableDispatchLog[]>();

  return logs.map(toDispatchLogDto);
}
