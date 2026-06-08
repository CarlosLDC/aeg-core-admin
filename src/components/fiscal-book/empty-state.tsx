export function FiscalBookEmptyState({
  type,
  filtered,
}: {
  type: "services" | "inspections";
  filtered?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-border">
        <span className="text-xl opacity-30 grayscale">📋</span>
      </div>
      <h3 className="text-sm font-bold uppercase tracking-widest text-muted">
        {filtered ? "Sin coincidencias" : "Libro sin registros"}
      </h3>
      <p className="mx-auto mt-1 max-w-xs text-xs text-muted/80">
        {filtered
          ? "Ajuste o borre los filtros para ver más entradas."
          : `No se han encontrado ${type === "services" ? "servicios" : "inspecciones"}.`}
      </p>
    </div>
  );
}
