"use client";

import { useEffect } from "react";
import Link from "next/link";
import { captureException } from "@/lib/error-reporting";

export default function ToolsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error, { tags: { boundary: "tools-error" } });
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-lg font-semibold text-foreground">Algo salió mal</h1>
      <p className="max-w-md text-sm text-muted">
        Ocurrió un error inesperado en Tools. Puedes reintentar o volver al
        listado.
      </p>
      {process.env.NODE_ENV !== "production" ? (
        <pre className="max-w-xl overflow-x-auto rounded-lg border border-border bg-card p-3 text-left text-xs text-rose-700 dark:text-rose-300">
          {error.message}
        </pre>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
        >
          Reintentar
        </button>
        <Link
          href="/tools"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
        >
          Volver a Tools
        </Link>
      </div>
    </div>
  );
}
