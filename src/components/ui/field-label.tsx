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
