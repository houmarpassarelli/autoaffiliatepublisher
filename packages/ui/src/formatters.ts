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

/** Desconto percentual, sem casas decimais — é sinalização, não contabilidade. */
export function formatDiscount(discountPct: number): string {
  return `${Math.round(discountPct).toString()}%`;
}
