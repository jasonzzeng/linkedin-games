import { useEffect, useState } from 'react';

interface ToastProps {
  message: string | null;
  /** 'error' tints the pill red; 'info' keeps it neutral. */
  tone?: 'info' | 'error';
}

export function Toast({ message, tone = 'info' }: ToastProps) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    setVisible(Boolean(message));
  }, [message]);

  if (!message || !visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 z-40 max-w-[min(90vw,28rem)] -translate-x-1/2
        rounded-full px-5 py-3 text-center text-sm font-medium shadow-lg animate-rise-in ${
          tone === 'error'
            ? 'bg-danger text-white'
            : 'bg-ink text-inverse'
        }`}
    >
      {message}
    </div>
  );
}
