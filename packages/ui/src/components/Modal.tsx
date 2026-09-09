// packages/ui/src/components/Modal.tsx
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type ModalSize = 'sm' | 'md' | 'lg';

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  /** Ações do rodapé — tipicamente confirmar e cancelar. */
  footer?: ReactNode;
  size?: ModalSize;
  /**
   * Impede o fechamento por Esc ou por clique no fundo. Reservado a operações
   * em andamento que não podem ser interrompidas pela metade.
   */
  dismissible?: boolean;
  children: ReactNode;
}

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'modal-dialog modal-sm',
  md: 'modal-dialog',
  lg: 'modal-dialog modal-lg',
};

/**
 * Modal implementado em React puro sobre as classes CSS do Tabler.
 *
 * O JavaScript do Bootstrap não é usado, por duas razões: ele manipula o DOM por
 * fora e conflita com a árvore controlada pelo React; e coordena a exibição por
 * eventos `transitionend`, que a regra de "sem animações" do projeto torna
 * imprevisíveis. Sem a classe `fade`, o diálogo simplesmente está presente ou
 * ausente — que é exatamente o comportamento pedido.
 *
 * A marcação, porém, preserva a estrutura do kit — `.modal` > `.modal-dialog` >
 * `.modal-content`, mais `.modal-backdrop`. O `.modal-content` herda o fundo, a
 * borda e o raio de variáveis CSS declaradas no escopo de `.modal`: substituir
 * esse wrapper por um contêiner próprio deixa o diálogo transparente.
 */
export function Modal({
  open,
  title,
  onClose,
  footer,
  size = 'md',
  dismissible = true,
  children,
}: ModalProps): React.JSX.Element | null {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  // Guarda quem tinha o foco antes da abertura, para devolvê-lo no fechamento.
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    // O foco entra no diálogo: sem isso, o teclado continuaria navegando a página
    // por baixo, que está visualmente bloqueada.
    dialogRef.current?.focus();

    // A página de trás não deve rolar enquanto o diálogo está aberto.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape' && dismissible) {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open, dismissible, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <>
      {/* Fundo escurecido. Sem a classe `fade`, ele simplesmente está lá. */}
      <div className="modal-backdrop show" />

      <div
        className="modal d-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={dialogRef}
        onMouseDown={(event) => {
          // Só o clique iniciado no próprio fundo fecha: um arrasto que começou
          // dentro do diálogo e terminou fora não deve descartar o formulário.
          if (dismissible && event.target === event.currentTarget) {
            onClose();
          }
        }}
      >
        <div className={SIZE_CLASS[size]}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id={titleId}>
                {title}
              </h5>
              <button type="button" className="btn-close" aria-label="Fechar" onClick={onClose} />
            </div>

            <div className="modal-body">{children}</div>

            {footer ? <div className="modal-footer">{footer}</div> : null}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
