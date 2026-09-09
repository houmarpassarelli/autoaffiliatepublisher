// packages/ui/src/components/Badge.tsx
import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: 'badge bg-secondary-lt',
  info: 'badge bg-blue-lt',
  success: 'badge bg-green-lt',
  warning: 'badge bg-yellow-lt',
  danger: 'badge bg-red-lt',
};

/** Etiqueta de estado. Usada em status de oferta, modo de canal e presença. */
export function Badge({ tone = 'neutral', children }: BadgeProps): React.JSX.Element {
  return <span className={TONE_CLASS[tone]}>{children}</span>;
}
