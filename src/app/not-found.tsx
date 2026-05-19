import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-muted">404</p>
      <h1 className="text-lg font-semibold text-foreground">Página no encontrada</h1>
      <p className="max-w-md text-sm text-muted">
        La ruta que buscas no existe o fue movida.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
      >
        Volver al panel
      </Link>
    </div>
  );
}
