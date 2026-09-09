// packages/ui/src/components/StateViews.tsx
import type { ReactNode } from 'react';
import { Button } from './Button.js';

/**
 * Os três estados que toda listagem da aplicação precisa saber comunicar.
 *
 * Estão no mesmo arquivo porque formam um conjunto: a tela que mostra dados é a
 * mesma que precisa dizer "estou buscando", "não há nada" ou "não consegui".
 * Nenhum deles usa movimento — a informação vem do texto, não de um spinner ou
 * de um esqueleto pulsante, que a regra de "sem animações" congelaria.
 */

export interface LoadingStateProps {
  /** O que está sendo carregado, em minúsculas (ex.: "as fontes de coleta"). */
  subject?: string;
}

/** Carregamento em andamento. */
export function LoadingState({ subject }: LoadingStateProps): React.JSX.Element {
  return (
    <div className="empty" aria-busy="true" aria-live="polite">
      <p className="empty-title">Carregando…</p>
      {subject ? <p className="empty-subtitle text-secondary">Buscando {subject}.</p> : null}
    </div>
  );
}

export interface EmptyStateProps {
  title: string;
  /** Explica por que está vazio ou o que fazer a respeito. */
  description?: string;
  /** Ação que resolve o vazio, como cadastrar o primeiro item. */
  action?: ReactNode;
}

/** Ausência legítima de dados — diferente de erro. */
export function EmptyState({ title, description, action }: EmptyStateProps): React.JSX.Element {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {description ? <p className="empty-subtitle text-secondary">{description}</p> : null}
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  /** Mensagem técnica do erro. Exibida como está, sem reinterpretação. */
  message: string;
  /** Quando informado, oferece nova tentativa sem recarregar a página. */
  onRetry?: () => void;
}

/** Falha ao obter os dados, com caminho de recuperação quando houver. */
export function ErrorState({
  title = 'Não foi possível carregar',
  message,
  onRetry,
}: ErrorStateProps): React.JSX.Element {
  return (
    <div className="empty" role="alert">
      <p className="empty-title text-danger">{title}</p>
      <p className="empty-subtitle text-secondary">{message}</p>
      {onRetry ? (
        <div className="empty-action">
          <Button variant="secondary" onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      ) : null}
    </div>
  );
}
