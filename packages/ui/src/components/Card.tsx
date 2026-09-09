// packages/ui/src/components/Card.tsx
import type { ReactNode } from 'react';

export interface CardProps {
  /** Título do cartão. Sem ele, o cabeçalho não é renderizado. */
  title?: string;
  /** Ações do cabeçalho, alinhadas à direita do título. */
  actions?: ReactNode;
  /** Rodapé opcional, usado para ações secundárias ou metadados. */
  footer?: ReactNode;
  /**
   * Remove o espaçamento interno do corpo. Necessário quando o conteúdo é uma
   * tabela, que traz o próprio espaçamento e ficaria desalinhada com a borda.
   */
  flush?: boolean;
  children: ReactNode;
}

/** Superfície padrão de conteúdo das duas interfaces. */
export function Card({ title, actions, footer, flush, children }: CardProps): React.JSX.Element {
  return (
    <div className="card">
      {title || actions ? (
        <div className="card-header d-flex align-items-center justify-content-between gap-2">
          {title ? <h3 className="card-title mb-0">{title}</h3> : <span />}
          {actions ? <div className="d-flex gap-2">{actions}</div> : null}
        </div>
      ) : null}

      <div className={flush ? '' : 'card-body'}>{children}</div>

      {footer ? <div className="card-footer">{footer}</div> : null}
    </div>
  );
}
