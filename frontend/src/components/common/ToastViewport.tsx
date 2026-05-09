export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastViewportProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

function toneClasses(type: ToastType): string {
  if (type === 'success') {
    return 'border-emerald-200 border-l-4 border-l-emerald-500 bg-white text-emerald-800';
  }

  if (type === 'error') {
    return 'border-rose-200 border-l-4 border-l-rose-500 bg-white text-rose-800';
  }

  return 'border-bank-border border-l-4 border-l-bank-cosmic bg-white text-bank-ink';
}

function labelFor(type: ToastType): string {
  if (type === 'success') {
    return 'Izdevās';
  }

  if (type === 'error') {
    return 'Kļūda';
  }

  return 'Info';
}

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-[110] flex w-[min(560px,calc(100vw-1.5rem))] -translate-x-1/2 flex-col gap-2 sm:top-5">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.type === 'error' ? 'alert' : 'status'}
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
          className={`pointer-events-auto rounded-lg border px-3 py-2.5 shadow-[0_12px_32px_rgba(17,34,64,0.14)] ${toneClasses(toast.type)}`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bank-muted">{labelFor(toast.type)}</p>
              <p className="mt-1 text-sm leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="rounded-md px-1.5 py-0.5 text-xs font-semibold text-bank-muted transition hover:bg-black/5 hover:text-bank-ink"
              aria-label="Aizvērt paziņojumu"
            >
              Aizvērt
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
