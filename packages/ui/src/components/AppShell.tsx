// packages/ui/src/components/AppShell.tsx
import type { ReactNode } from 'react';

export type AppShellTone = 'admin' | 'remote';

export interface AppShellProps {
  /** Identificação da interface exibida ao lado do nome do produto. */
  label: string;
  /** Diferencia visualmente o painel administrativo do painel de curadoria. */
  tone: AppShellTone;
  /** Conteúdo do topo alinhado à direita, como a identificação do operador. */
  toolbar?: ReactNode;
  children: ReactNode;
}

// Cada interface tem sua cor de identificação, para que o operador saiba num
// relance em qual painel está — o administrativo é sensível, o remoto não.
const TONE_CLASS: Record<AppShellTone, string> = {
  admin: 'bg-blue-lt',
  remote: 'bg-purple-lt',
};

/**
 * Moldura comum das duas interfaces: barra superior fixa com a identificação do
 * painel e o container onde a página é renderizada.
 */
export function AppShell({ label, tone, toolbar, children }: AppShellProps): React.JSX.Element {
  return (
    <div className="page">
      <header className="navbar navbar-expand-md border-bottom d-print-none">
        <div className="container-xl d-flex align-items-center gap-2">
          <span className="navbar-brand mb-0 fs-3 p-0">Auto Affiliate Publisher</span>
          <span className={`badge ${TONE_CLASS[tone]}`}>{label}</span>
          {toolbar ? <div className="ms-auto">{toolbar}</div> : null}
        </div>
      </header>

      <div className="page-body">
        <div className="container-xl">{children}</div>
      </div>
    </div>
  );
}
