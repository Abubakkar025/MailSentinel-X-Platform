"use client";

import { useEffect } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  intent?: "danger" | "info" | "primary";
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ACCENT = {
  danger: {
    icon: "text-red-400 bg-red-500/10 border-red-500/25",
    confirm:
      "bg-red-500/90 hover:bg-red-500 text-white border border-red-400/40",
  },
  info: {
    icon: "text-sky-400 bg-sky-500/10 border-sky-500/25",
    confirm:
      "bg-sky-500/90 hover:bg-sky-500 text-white border border-sky-400/40",
  },
  primary: {
    icon: "text-blue-400 bg-blue-500/10 border-blue-500/25",
    confirm:
      "bg-blue-500/90 hover:bg-blue-500 text-white border border-blue-400/40",
  },
};

export function ConfirmDialog({
  open,
  intent = "danger",
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const accent = ACCENT[intent];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={onCancel}
    >
      <div
        className="glass-panel rounded-2xl w-full max-w-md animate-scale-in shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div
              className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${accent.icon}`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2
                id="confirm-dialog-title"
                className="text-sm font-semibold text-slate-100"
              >
                {title}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                {description}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 border border-slate-700 bg-slate-800/60 hover:bg-slate-700/60 transition-colors disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 ${accent.confirm}`}
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}