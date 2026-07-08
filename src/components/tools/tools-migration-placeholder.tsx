import { TOOLS_MODULES } from "@/modules/tools";

type ToolsMigrationPlaceholderProps = {
  title: string;
  message: string;
  moduleIds: string[];
};

export function ToolsMigrationPlaceholder({
  title,
  message,
  moduleIds,
}: ToolsMigrationPlaceholderProps) {
  const modules = moduleIds
    .map((id) => TOOLS_MODULES.find((module) => module.id === id))
    .filter((module) => module != null);

  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Módulo en migración
        </p>
        <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
        <p className="max-w-3xl text-sm text-muted">{message}</p>
      </div>

      <div className="mt-6 rounded-xl border bg-background/60 p-4">
        <h3 className="text-sm font-medium text-foreground">
          Módulos delimitados en esta ruta
        </h3>
        <ul className="mt-3 space-y-3 text-sm text-muted">
          {modules.map((module) => (
            <li key={module.id} className="rounded-lg border bg-background p-3">
              <p className="font-medium text-foreground">{module.title}</p>
              <p className="mt-1">{module.description}</p>
              <p className="mt-2 text-xs">
                Estado: <span className="font-medium">{module.status}</span>
                {" · "}
                Prioridad: <span className="font-medium">{module.priority}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 text-sm text-muted">
        El inventario completo vive en `src/modules/tools/README.md` y
        `src/modules/tools/tools-registry.ts`.
      </p>
    </section>
  );
}
