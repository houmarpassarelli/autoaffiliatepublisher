// packages/ui/src/components/DataTable.tsx
import type { ReactNode } from 'react';
import { EmptyState, ErrorState, LoadingState } from './StateViews.js';

export type ColumnAlign = 'start' | 'center' | 'end';

export interface DataTableColumn<T> {
  /** Identificador estável da coluna, usado como chave de renderização. */
  key: string;
  header: string;
  /** Como a célula daquela linha é desenhada. */
  render: (row: T) => ReactNode;
  align?: ColumnAlign;
  /** Largura fixa opcional (ex.: '12rem') para colunas de ação ou data. */
  width?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  /** Chave estável da linha. Índice de array não serve: a lista é reordenável. */
  rowKey: (row: T) => string;
  loading?: boolean;
  /** Mensagem de falha. Tem precedência sobre a listagem. */
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  /** Descrição da tabela para leitores de tela. */
  caption?: string;
}

const ALIGN_CLASS: Record<ColumnAlign, string> = {
  start: 'text-start',
  center: 'text-center',
  end: 'text-end',
};

/**
 * Tabela de dados com os três estados de retorno embutidos.
 *
 * A ordem das verificações é deliberada: erro vence carregamento, e ambos vencem
 * a lista vazia. Uma tabela que falhou ao carregar não pode ser apresentada como
 * "nenhum registro encontrado" — são situações diferentes e exigem ações
 * diferentes do operador.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  error = null,
  onRetry,
  emptyTitle = 'Nenhum registro encontrado',
  emptyDescription,
  emptyAction,
  caption,
}: DataTableProps<T>): React.JSX.Element {
  if (error) {
    return <ErrorState message={error} {...(onRetry ? { onRetry } : {})} />;
  }

  if (loading) {
    return <LoadingState />;
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        {...(emptyDescription ? { description: emptyDescription } : {})}
        {...(emptyAction ? { action: emptyAction } : {})}
      />
    );
  }

  return (
    <div className="table-responsive">
      <table className="table card-table table-vcenter">
        {caption ? <caption className="visually-hidden">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={ALIGN_CLASS[column.align ?? 'start']}
                style={column.width ? { width: column.width } : undefined}
                scope="col"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.key} className={ALIGN_CLASS[column.align ?? 'start']}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
