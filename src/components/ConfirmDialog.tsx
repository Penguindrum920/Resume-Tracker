import { AlertTriangle, X } from "lucide-react";
import { useEffect, useRef } from "react";

export function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div
        className="dialog-panel"
        onClick={(e) => e.stopPropagation()}
        ref={dialogRef}
        role="alertdialog"
      >
        <div className="dialog-icon">
          <AlertTriangle size={28} />
        </div>
        <p className="dialog-message">{message}</p>
        <div className="dialog-actions">
          <button className="button secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="button danger" onClick={onConfirm}>
            Delete
          </button>
        </div>
        <button className="dialog-close" onClick={onCancel} aria-label="Close">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
