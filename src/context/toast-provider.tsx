"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error";

type Toast = {
  id: string;
  type: ToastType;
  message: string;
};

type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4500;
const EXIT_MS = 180;

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const [exiting, setExiting] = useState(false);

  const dismiss = useCallback(() => {
    setExiting((current) => {
      if (current) return current;
      return true;
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [dismiss]);

  useEffect(() => {
    if (!exiting) return;
    const timer = window.setTimeout(() => onRemove(toast.id), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [exiting, onRemove, toast.id]);

  const isSuccess = toast.type === "success";

  return (
    <div
      role="alert"
      className={cn(
        "pointer-events-auto flex items-start gap-3.5 rounded-xl border px-5 py-4 text-[15px] leading-snug shadow-lg backdrop-blur-md",
        exiting ? "toast-exit" : "toast-enter",
        isSuccess
          ? "border-l-[3px] border-l-teal-500/50 border-teal-200/70 bg-card/95 text-card-foreground shadow-slate-900/6 dark:border-teal-500/25 dark:border-l-teal-400/45 dark:bg-card/90 dark:shadow-black/25"
          : "border-l-[3px] border-l-amber-500/50 border-amber-200/70 bg-card/95 text-card-foreground shadow-slate-900/6 dark:border-amber-500/25 dark:border-l-amber-400/45 dark:bg-card/90 dark:shadow-black/25",
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          isSuccess
            ? "bg-teal-500/10 text-teal-700 dark:bg-teal-400/12 dark:text-teal-300"
            : "bg-amber-500/10 text-amber-800 dark:bg-amber-400/12 dark:text-amber-200",
        )}
      >
        {isSuccess ? (
          <CheckCircle2 className="size-5" aria-hidden />
        ) : (
          <AlertCircle className="size-5" aria-hidden />
        )}
      </div>
      <p className="min-w-0 flex-1 pt-1.5 font-medium">{toast.message}</p>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
        aria-label="Cerrar"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type: ToastType, message: string) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, type, message }]);
  }, []);

  const value = useMemo(
    () => ({
      success: (message: string) => push("success", message),
      error: (message: string) => push("error", message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed top-4 right-0 z-[100] flex w-full max-w-[min(100%,26rem)] flex-col gap-3 px-4 sm:top-5 sm:right-5 sm:px-0"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de ToastProvider");
  }
  return context;
}
