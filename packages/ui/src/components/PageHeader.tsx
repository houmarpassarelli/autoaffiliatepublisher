// packages/ui/src/components/PageHeader.tsx
import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  /** Explicação curta do que a tela faz. Opcional. */
  subtitle?: string;
  /** Ações principais da página, alinhadas à direita do título. */
  actions?: ReactNode;
}

/** Cabeçalho de página: título, subtítulo opcional e ações da tela. */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps): React.JSX.Element {
  return (
    <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
      <div>
        <h1 className="page-title mb-0">{title}</h1>
        {subtitle ? <p className="text-secondary mb-0 mt-1">{subtitle}</p> : null}
      </div>
      {actions ? <div className="d-flex gap-2">{actions}</div> : null}
    </div>
  );
}
