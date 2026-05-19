"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#020617] px-4 text-center text-[#f1f5f9]">
        <h1 className="text-lg font-semibold">Error crítico</h1>
        <p className="max-w-md text-sm opacity-80">
          No se pudo cargar la aplicación. {error.message}
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-[#3366ff] px-4 py-2 text-sm font-medium text-white"
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
