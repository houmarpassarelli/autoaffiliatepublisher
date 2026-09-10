// apps/api/src/modules/audit/auditCsv.ts
import { DispatchActionType, type DispatchLogDto } from '@aap/shared';

/**
 * Serialização do recorte de auditoria em CSV.
 *
 * O arquivo existe para um uso declarado e específico: o rateio de comissão é um
 * cruzamento entre esta base e a planilha de vendas exportada da plataforma de
 * afiliados (MONETIZACAO.md, Seção 3.2). O destino, portanto, é uma planilha —
 * e as três decisões abaixo seguem daí.
 */

/**
 * Separador ponto e vírgula e marca de ordem de bytes.
 *
 * O Excel em português abre CSV separado por vírgula despejando tudo numa única
 * coluna, e sem a BOM interpreta o arquivo como Latin-1, corrompendo todo
 * acento. As duas escolhas são para que o arquivo abra correto com dois cliques,
 * que é como ele vai ser usado.
 */
const DELIMITER = ';';
const BYTE_ORDER_MARK = '﻿';

/** Rótulos das colunas, na mesma ordem e com os mesmos nomes da tela. */
const HEADERS = [
  'Data/Hora',
  'Operador',
  'Produto',
  'SKU',
  'Loja',
  'Preço',
  'Canais',
  'Ação',
  'Status',
  'Link',
] as const;

/** Caracteres que uma planilha interpreta como início de fórmula. */
const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Escapa um valor para uma célula.
 *
 * Além do escape usual de aspas e separador, neutraliza a **injeção de fórmula**:
 * o título do produto e o nome da loja vêm de dados coletados de terceiros, e um
 * valor começando com `=` seria executado como fórmula ao abrir o arquivo. O
 * apóstrofo à frente força a planilha a tratar a célula como texto.
 */
function escapeCell(value: string): string {
  const neutralized = FORMULA_PREFIXES.some((prefix) => value.startsWith(prefix))
    ? `'${value}`
    : value;

  return `"${neutralized.replace(/"/g, '""')}"`;
}

/** Data e hora no formato que a planilha em português reconhece. */
function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  const pad = (value: number): string => String(value).padStart(2, '0');

  return (
    `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${String(date.getFullYear())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/** Preço com vírgula decimal, para que a planilha o leia como número. */
function formatPrice(price: number): string {
  return price.toFixed(2).replace('.', ',');
}

/** Natureza da ação resolutiva, por extenso. */
function describeAction(actionType: DispatchActionType): string {
  return actionType === DispatchActionType.PUBLISHED_API
    ? 'Publicado por API'
    : 'Copiado para área de transferência';
}

/**
 * Resultado da entrega por canal.
 *
 * Enquanto o worker de disparo não existir, o mapa chega vazio em toda linha — e
 * o arquivo diz isso, em vez de sugerir uma entrega que nenhum driver realizou.
 */
function describeDelivery(deliveryStatus: Record<string, string>): string {
  const entries = Object.entries(deliveryStatus);

  if (entries.length === 0) {
    return 'Aguardando disparo';
  }

  return entries.map(([channel, status]) => `${channel}: ${status}`).join(' | ');
}

/** Monta o arquivo inteiro a partir do recorte filtrado. */
export function toCsv(logs: DispatchLogDto[]): string {
  const rows = logs.map((log) =>
    [
      formatDateTime(log.dispatchedAt),
      log.operatorName,
      log.offerTitle,
      log.productSku,
      log.sourceName,
      formatPrice(log.priceAtDispatch),
      log.channels.join(', '),
      describeAction(log.actionType),
      describeDelivery(log.deliveryStatus),
      log.affiliateUrl,
    ]
      .map(escapeCell)
      .join(DELIMITER),
  );

  const header = HEADERS.map(escapeCell).join(DELIMITER);

  return BYTE_ORDER_MARK + [header, ...rows].join('\r\n');
}

/** Nome do arquivo, carimbado com o instante da exportação. */
export function buildExportFilename(now: Date = new Date()): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  const stamp =
    `${String(now.getFullYear())}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}`;

  return `auditoria-disparos-${stamp}.csv`;
}
