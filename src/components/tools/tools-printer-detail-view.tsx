"use client";

import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ToolsPrinterStatusBar } from "@/components/tools/tools-printer-status-bar";
import { ToolsReprintPanel } from "@/components/tools/tools-reprint-panel";
import { useToolsPrinters } from "@/modules/tools/printers/use-tools-printers";
import {
  toolsListPath,
  toolsPrinterFormasPagoPath,
  toolsPrinterReporteZPath,
  toolsPrinterWifiPath,
} from "@/lib/resource-routes";

type ToolsPrinterDetailViewProps = {
  serial: string;
};

function OptionLink({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:bg-foreground/[0.03]"
    >
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </Link>
  );
}

export function ToolsPrinterDetailView({ serial }: ToolsPrinterDetailViewProps) {
  const { loading, error, reload, findBySerial } = useToolsPrinters();
  const printer = findBySerial(serial);

  if (loading && !printer) {
    return (
      <div className="flex items-center justify-center py-16 text-muted">
        Cargando impresora…
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState message={error} onRetry={() => void reload()} retrying={loading} />
    );
  }

  if (!printer) {
    return (
      <EmptyState
        title="Impresora no encontrada"
        description={`No se encontró la impresora con serial ${serial} en tu alcance operativo.`}
        action={
          <Link
            href={toolsListPath}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-foreground/5"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Volver a Tools
          </Link>
        }
      />
    );
  }

  const client = printer.clientSummary;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={toolsListPath}
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Volver al listado
        </Link>
        <h2 className="mt-3 text-2xl font-semibold text-foreground">
          {printer.serial}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Panel de operaciones de campo para la impresora seleccionada.
        </p>
      </div>

      {!printer.macAddress && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            Esta impresora no tiene dirección MAC registrada. Las operaciones MQTT
            requieren MAC en el catálogo.
          </p>
        </div>
      )}

      <ToolsPrinterStatusBar
        printerId={printer.id}
        macAddress={printer.macAddress}
      />

      <section className="rounded-xl border bg-card p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Resumen
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted">Estado</p>
            <p className="font-medium">{printer.estado}</p>
          </div>
          <div>
            <p className="text-xs text-muted">MAC</p>
            <p className="font-medium">{printer.macAddress ?? "Sin MAC"}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Firmware</p>
            <p className="font-medium">{printer.firmware}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Ubicación</p>
            <p className="font-medium">{printer.ubicacion}</p>
          </div>
        </div>
      </section>

      {client && (
        <section className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Información del cliente
          </h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted">Nombre</dt>
              <dd className="font-medium">{client.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Teléfono</dt>
              <dd className="font-medium">{client.phone}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Email</dt>
              <dd className="font-medium">{client.email}</dd>
            </div>
          </dl>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Operaciones
        </h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <OptionLink
            title="Configurar WiFi"
            description="Escanear redes y conectar la impresora."
            href={toolsPrinterWifiPath(printer.serial)}
          />
          <OptionLink
            title="Reporte Z / Cierre"
            description="Generar, transmitir y reimprimir reportes Z."
            href={toolsPrinterReporteZPath(printer.serial)}
          />
          <OptionLink
            title="Formas de pago"
            description="Consultar y editar descripciones de pago."
            href={toolsPrinterFormasPagoPath(printer.serial)}
          />
        </div>
      </section>

      {printer.macAddress ? <ToolsReprintPanel printer={printer} /> : null}
    </div>
  );
}
