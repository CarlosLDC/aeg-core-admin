"use client";

import { useEffect } from "react";
import Link from "next/link";
import { captureException } from "@/lib/error-reporting";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error, { tags: { boundary: "app-error" } });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <h1 className="text-lg font-semibold text-foreground">Algo salió mal</h1>
      <p className="max-w-md text-sm text-muted">
        Ocurrió un error inesperado. Puedes reintentar o volver al inicio.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
