import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import type { Toast } from "../hooks/useToast";

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div className={`toast toast-${toast.type}`} key={toast.id}>
            <Icon size={16} />
            <span>{toast.message}</span>
            <button
              className="toast-close"
              onClick={() => onRemove(toast.id)}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
