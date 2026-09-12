// packages/ui/src/formatters.ts

/**
 * Formatadores de apresentação, compartilhados pelas duas interfaces.
 *
 * Centralizados para que preço e horário tenham a mesma aparência em todo o
 * produto: o operador decide em 5 a 10 segundos comparando valores entre cards,
 * e o administrador confere na auditoria o preço exato que foi ao ar. Os dois
 * precisam ler o mesmo número escrito do mesmo jeito.
 */

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

/** Preço em reais. */
export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

/** Data e hora locais a partir do texto ISO devolvido pelo backend. */
export function formatDateTime(isoDate: string): string {
  return dateTimeFormatter.format(new Date(isoDate));
}

/** Unidades do tempo restante, da maior para a menor. */
const MS_PER_SECOND = 1_000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

/** Duas casas para as unidades menores, que a maior à esquerda já qualifica. */
function padUnit(value: number): string {
  return value.toString().padStart(2, '0');
}

/**
 * Tempo restante de uma contagem regressiva.
 *
 * A unidade maior é suprimida enquanto estiver zerada — "09 s" em vez de
 * "0 h 00 min 09 s" — porque o operador lê este número de relance, junto do
 * horário absoluto que ele qualifica, e cada unidade inútil disputa essa atenção.
 *
 * Valores negativos são clampados em zero: quem decide o que significa um alvo
 * vencido é a tela, e ela nunca deve receber daqui um tempo ao contrário.
 */
export function formatCountdown(remainingMs: number): string {
  const total = Math.max(0, Math.floor(remainingMs));

  const hours = Math.floor(total / MS_PER_HOUR);
  const minutes = Math.floor((total % MS_PER_HOUR) / MS_PER_MINUTE);
  const seconds = Math.floor((total % MS_PER_MINUTE) / MS_PER_SECOND);

  if (hours > 0) {
    return `${hours.toString()} h ${padUnit(minutes)} min ${padUnit(seconds)} s`;
  }

  if (minutes > 0) {
    return `${padUnit(minutes)} min ${padUnit(seconds)} s`;
  }

  return `${padUnit(seconds)} s`;
}

/** Desconto percentual, sem casas decimais — é sinalização, não contabilidade. */
export function formatDiscount(discountPct: number): string {
  return `${Math.round(discountPct).toString()}%`;
}
