import { NoData } from "@/components/fiscal-book/no-data";
import type { FiscalAnnualInspection } from "@/lib/fiscal-book/types";

export function FiscalBookInspectionSheet({
  inspection,
}: {
  inspection: FiscalAnnualInspection;
}) {
  return (
    <div className="space-y-12">
      <section>
        <h2 className="mb-6 border-b border-border pb-2 text-[11px] font-black uppercase tracking-widest">
          1. DATOS DEL CENTRO Y TÉCNICO
        </h2>
        <div className="border border-border bg-foreground/[0.02] p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <FieldLabel>Centro de Servicio Técnico</FieldLabel>
              <p className="text-xs font-black uppercase tracking-tight">
                {inspection.serviceCenter || <NoData />}
              </p>
            </div>
            <div>
              <FieldLabel>RIF Centro de Servicio</FieldLabel>
              <p className="font-mono text-xs font-black uppercase">
                {inspection.centerRif || <NoData />}
              </p>
            </div>
            <div>
              <FieldLabel>Fecha de Inspección</FieldLabel>
              <p className="font-mono text-xs font-black uppercase">
                {inspection.date || <NoData />}
              </p>
            </div>
            <div>
              <FieldLabel>Inspector Actuante</FieldLabel>
              <p className="text-xs font-black uppercase">
                {inspection.inspector || <NoData />}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-6 border-b border-border pb-2 text-[11px] font-black uppercase tracking-widest">
          2. DETALLES DE LA INSPECCIÓN
        </h2>
        <div className="border border-border bg-foreground/[0.02] p-6">
          <FieldLabel>Observaciones y Hallazgos</FieldLabel>
          <p className="whitespace-pre-wrap border border-border bg-card p-4 text-sm font-medium uppercase leading-relaxed">
            {inspection.observations || <NoData />}
          </p>
        </div>
      </section>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-[9px] font-bold uppercase tracking-tighter text-muted">
      {children}
    </label>
  );
}
