import { NoData } from "@/components/fiscal-book/no-data";
import { formatTimestamp } from "@/lib/fiscal-book/fiscal-helpers";
import type { FiscalPrinter, TechnicalReview } from "@/lib/fiscal-book/types";

export function FiscalBookTechSheet({
  review,
  printer,
}: {
  review: TechnicalReview;
  printer: FiscalPrinter;
}) {
  return (
    <div className="space-y-12">
      <section>
        <h2 className="mb-6 border-b border-border pb-2 text-[11px] font-black uppercase tracking-widest">
          1. DATOS DEL SERVICIO
        </h2>
        <div className="border border-border bg-foreground/[0.02] p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <FieldLabel>Centro de Servicio Técnico Autorizado</FieldLabel>
              <p className="text-xs font-black uppercase tracking-tight">
                {review.serviceCenter || <NoData />}
              </p>
            </div>
            <div>
              <FieldLabel>RIF Centro de Servicio</FieldLabel>
              <p className="font-mono text-xs font-black uppercase">
                {review.centerRif || <NoData />}
              </p>
            </div>
            <div>
              <FieldLabel>Fecha de Solicitud</FieldLabel>
              <p className="font-mono text-xs font-black uppercase">
                {review.fechaSolicitud || <NoData />}
              </p>
            </div>
            <div>
              <FieldLabel>Fecha de Inicio</FieldLabel>
              <p className="font-mono text-xs font-black uppercase">
                {review.startDate || review.date || <NoData />}
              </p>
            </div>
            <div>
              <FieldLabel>Fecha de Fin</FieldLabel>
              <p className="font-mono text-xs font-black uppercase">
                {review.endDate || <NoData />}
              </p>
            </div>
            <div>
              <FieldLabel>Primera Reporte Z</FieldLabel>
              <p className="font-mono text-xs font-black uppercase">
                {review.zReportStart || <NoData />}
              </p>
            </div>
            <div>
              <FieldLabel>Fecha y Hora de Primer Reporte Z</FieldLabel>
              <p className="font-mono text-xs font-black uppercase">
                {formatTimestamp(review.zReportTimestampStart) || <NoData />}
              </p>
            </div>
            <div>
              <FieldLabel>Último Reporte Z</FieldLabel>
              <p className="font-mono text-xs font-black uppercase">
                {review.zReportEnd || <NoData />}
              </p>
            </div>
            <div>
              <FieldLabel>Fecha y Hora de Último Reporte Z</FieldLabel>
              <p className="font-mono text-xs font-black uppercase">
                {formatTimestamp(review.zReportTimestampEnd) || <NoData />}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-6 border-b border-border pb-2 text-[11px] font-black uppercase tracking-widest">
          2. GESTIÓN DE PRECINTOS
        </h2>
        <div className="border border-border bg-foreground/[0.02] p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <FieldLabel>Serial del Precinto Actual</FieldLabel>
              <p className="font-mono text-xs font-black uppercase">
                {review.currentSealSerial || <NoData />}
              </p>
            </div>
            <div>
              <FieldLabel>¿Precinto Violentado?</FieldLabel>
              <p
                className={`text-xs font-black uppercase ${review.sealBroken ? "text-rose-500" : "text-emerald-600"}`}
              >
                {review.sealBroken ? "SÍ" : "NO"}
              </p>
            </div>
            <div>
              <FieldLabel>¿Se Cambió el Precinto?</FieldLabel>
              <p
                className={`text-xs font-black uppercase ${review.sealReplaced ? "text-accent" : "text-muted"}`}
              >
                {review.sealReplaced ? "SÍ" : "NO"}
              </p>
            </div>
            <div>
              <FieldLabel>Serial del Nuevo Precinto</FieldLabel>
              <p className="font-mono text-xs font-black uppercase">
                {review.newSealSerial || <NoData />}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-6 border-b border-border pb-2 text-[11px] font-black uppercase tracking-widest">
          3. DETALLES DE LA INTERVENCIÓN
        </h2>
        <div className="border border-border bg-foreground/[0.02] p-6">
          <FieldLabel>Falla Reportada y Acción Realizada</FieldLabel>
          <p className="whitespace-pre-wrap border border-border bg-card p-4 text-sm font-medium uppercase leading-relaxed">
            {review.description || <NoData />}
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-6 border-b border-border pb-2 text-[11px] font-black uppercase tracking-widest">
          4. CIERRE Y RESPONSABILIDADES
        </h2>
        <div className="border border-border bg-foreground/[0.02] p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <FieldLabel>Técnico Autorizado</FieldLabel>
              <p className="text-xs font-black uppercase">
                {review.technician || <NoData />}
              </p>
            </div>
            <div>
              <FieldLabel>Persona que Recibe</FieldLabel>
              <p className="text-xs font-black uppercase">
                {printer.businessName || <NoData />}
              </p>
            </div>
          </div>
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
