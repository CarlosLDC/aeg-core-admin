"use client";

type InactivityTimeoutDialogProps = {
  open: boolean;
  secondsLeft: number;
  onStayConnected: () => void;
};

export function InactivityTimeoutDialog({
  open,
  secondsLeft,
  onStayConnected,
}: InactivityTimeoutDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="inactivity-timeout-title"
      aria-describedby="inactivity-timeout-desc"
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <h2
          id="inactivity-timeout-title"
          className="text-lg font-semibold text-card-foreground"
        >
          Sesión por expirar
        </h2>
        <p id="inactivity-timeout-desc" className="mt-2 text-sm text-muted">
          Llevas 15 minutos sin actividad. Tu sesión se cerrará automáticamente
          si no respondes.
        </p>
        <p
          className="mt-6 text-center text-5xl font-semibold tabular-nums text-card-foreground"
          aria-live="polite"
          aria-atomic="true"
        >
          {secondsLeft}
        </p>
        <p className="mt-1 text-center text-xs text-muted">segundos</p>
        <button
          type="button"
          onClick={onStayConnected}
          className="mt-6 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90"
        >
          Permanecer conectado
        </button>
      </div>
    </div>
  );
}
