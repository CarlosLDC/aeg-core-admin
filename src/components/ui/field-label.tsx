import { cn } from "@/lib/utils";

type FieldLabelProps = {
  children: React.ReactNode;
  required?: boolean;
  className?: string;
};

/** Etiqueta de campo de formulario; muestra * si es obligatorio. */
export function FieldLabel({ children, required, className }: FieldLabelProps) {
  return (
    <span className={cn("mb-1.5 block text-sm font-medium", className)}>
      {children}
      {required ? (
        <span className="text-rose-600 dark:text-rose-400" aria-hidden="true">
          {" *"}
        </span>
      ) : null}
    </span>
  );
}

/** Leyenda minimalista para modales con campos obligatorios marcados con *. */
export function RequiredFieldsLegend({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-muted", className)}>
      <span className="text-rose-600 dark:text-rose-400" aria-hidden="true">
        *
      </span>{" "}
      Campos obligatorios
    </p>
  );
}
