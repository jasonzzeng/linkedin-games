import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  title: string;
  children?: ReactNode;
  /** Omit to render a single acknowledging action. */
  onCancel?: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'danger';
}

export function Modal({
  isOpen,
  title,
  children,
  onCancel,
  onConfirm,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
}: ModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    confirmRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onCancel) onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-lg bg-surface p-6 shadow-lg animate-pop-in"
      >
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        {children && <div className="mt-2 text-sm leading-relaxed text-muted">{children}</div>}
        <div className="mt-6 flex justify-end gap-2">
          {onCancel && (
            <Button variant="secondary" onClick={onCancel}>
              {cancelLabel}
            </Button>
          )}
          <Button ref={confirmRef} variant={confirmVariant} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
