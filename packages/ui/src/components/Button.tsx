// packages/ui/src/components/Button.tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant;
  /**
   * Ação em andamento. Desabilita o controle e troca o rótulo por `loadingLabel`.
   *
   * Deliberadamente não há spinner: o kit implementa spinners com `animation`,
   * que a regra de "sem animações" do projeto zera. Um spinner congelado
   * comunicaria a informação errada — a de que nada está acontecendo. Rótulo e
   * desabilitação são o retorno correto e não dependem de movimento.
   */
  loading?: boolean;
  loadingLabel?: string;
  /** Ocupa toda a largura disponível. Usado em rodapés de modal no celular. */
  block?: boolean;
  children: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-outline-secondary',
  danger: 'btn btn-danger',
  ghost: 'btn btn-ghost-secondary',
};

/** Botão padrão das duas interfaces, com estado de ação em andamento. */
export function Button({
  variant = 'secondary',
  loading = false,
  loadingLabel = 'Processando…',
  block = false,
  disabled,
  type = 'button',
  children,
  ...rest
}: ButtonProps): React.JSX.Element {
  const className = [VARIANT_CLASS[variant], block ? 'w-100' : ''].filter(Boolean).join(' ');

  return (
    <button
      {...rest}
      type={type}
      className={className}
      disabled={disabled === true || loading}
      aria-busy={loading}
    >
      {loading ? loadingLabel : children}
    </button>
  );
}
