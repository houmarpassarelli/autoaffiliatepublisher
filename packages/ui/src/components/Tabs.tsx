// packages/ui/src/components/Tabs.tsx
import type { ReactNode } from 'react';

export interface TabItem<TId extends string> {
  id: TId;
  label: string;
  /** Contador exibido ao lado do rótulo, como a quantidade de ofertas na aba. */
  count?: number;
}

export interface TabsProps<TId extends string> {
  items: TabItem<TId>[];
  activeId: TId;
  onChange: (id: TId) => void;
  /** Descrição do conjunto de abas para leitores de tela. */
  label: string;
  children: ReactNode;
}

/**
 * Abas controladas, implementadas em React.
 *
 * O JavaScript de abas do Bootstrap não é usado: além do conflito com a árvore
 * do React, ele aplica classes de transição que a regra de "sem animações"
 * neutraliza. Aqui a troca é apenas troca de estado — o painel some e o outro
 * aparece, sem passo intermediário.
 */
export function Tabs<TId extends string>({
  items,
  activeId,
  onChange,
  label,
  children,
}: TabsProps<TId>): React.JSX.Element {
  return (
    <>
      <ul className="nav nav-tabs" role="tablist" aria-label={label}>
        {items.map((item) => {
          const isActive = item.id === activeId;

          return (
            <li className="nav-item" key={item.id} role="presentation">
              <button
                type="button"
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={isActive}
                aria-controls={`panel-${activeId}`}
                className={isActive ? 'nav-link active' : 'nav-link'}
                onClick={() => onChange(item.id)}
              >
                {item.label}
                {typeof item.count === 'number' ? (
                  <span className="badge bg-secondary-lt ms-2">{item.count}</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <div
        role="tabpanel"
        id={`panel-${activeId}`}
        aria-labelledby={`tab-${activeId}`}
        className="card border-top-0 rounded-top-0"
      >
        {children}
      </div>
    </>
  );
}
