// apps/dashboard-remote/src/formatters.ts

/**
 * Formatadores da interface do operador.
 *
 * Centralizados para que preço e horário tenham a mesma aparência em todo o
 * painel: o operador decide em 5 a 10 segundos e compara valores entre cards.
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

/** Desconto percentual, sem casas decimais — é sinalização, não contabilidade. */
export function formatDiscount(discountPct: number): string {
  return `${Math.round(discountPct).toString()}%`;
}
