// packages/ui/src/components/Alert.tsx
import type { ReactNode } from 'react';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps {
  tone: AlertTone;
  title?: string;
  /** Quando informado, exibe o botão de dispensa. */
  onDismiss?: () => void;
  children: ReactNode;
}

const TONE_CLASS: Record<AlertTone, string> = {
  info: 'alert alert-info',
  success: 'alert alert-success',
  warning: 'alert alert-warning',
  danger: 'alert alert-danger',
};

// Erros e avisos precisam ser anunciados por leitores de tela assim que surgem;
// mensagens informativas não devem interromper a leitura em curso.
const TONE_ROLE: Record<AlertTone, 'alert' | 'status'> = {
  info: 'status',
  success: 'status',
  warning: 'alert',
  danger: 'alert',
};

/** Mensagem de retorno de uma ação ou do estado do sistema. */
export function Alert({ tone, title, onDismiss, children }: AlertProps): React.JSX.Element {
  return (
    <div className={TONE_CLASS[tone]} role={TONE_ROLE[tone]}>
      <div className="d-flex align-items-start justify-content-between gap-2">
        <div>
          {title ? <h4 className="alert-title">{title}</h4> : null}
          <div className="text-secondary">{children}</div>
        </div>
        {onDismiss ? (
          <button type="button" className="btn-close" aria-label="Dispensar" onClick={onDismiss} />
        ) : null}
      </div>
    </div>
  );
}
