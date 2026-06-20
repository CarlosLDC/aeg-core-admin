import { FISCAL_BOOKS_APP_URL } from "@/lib/fiscal-books-app";

export function UsersArchitectureNote() {
  return (
    <div className="rounded-xl border border-border bg-foreground/[0.02] px-4 py-3 text-sm text-muted">
      <p className="font-medium text-card-foreground">
        Una sola cuenta por usuario
      </p>
      <p className="mt-1">
        Todas las cuentas viven en el mismo catálogo. Los roles operativos y
        administradores acceden al panel y al{" "}
        <a
          href={FISCAL_BOOKS_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          libro fiscal
        </a>{" "}
        con el mismo correo y clave. Los auditores{" "}
        <span className="font-medium text-card-foreground">SENIAT</span> solo
        entran al libro fiscal, en modo lectura global.
      </p>
    </div>
  );
}
