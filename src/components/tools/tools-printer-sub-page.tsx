"use client";

import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { useToolsPrinters } from "@/modules/tools/printers/use-tools-printers";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import { toolsListPath, toolsPrinterPath } from "@/lib/resource-routes";

type ToolsPrinterSubPageProps = {
  title: string;
  description: string;
  children: (printer: ToolsPrinter) => React.ReactNode;
};

export function ToolsPrinterSubPage({ title, description, children }: ToolsPrinterSubPageProps) {
  const params = useParams();
  const serial = typeof params.serial === "string" ? params.serial : "";
  const { loading, error, reload, findBySerial } = useToolsPrinters();
  const printer = findBySerial(serial);

  if (loading && !printer) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void reload()} retrying={loading} />;
  }

  if (!printer) {
    return (
      <EmptyState
        title="Impresora no encontrada"
        description={`No se encontró la impresora con serial ${serial}.`}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={toolsPrinterPath(printer.serial)}
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Volver al detalle
        </Link>
        <h2 className="mt-3 text-2xl font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted">
          {description} — {printer.serial}
        </p>
      </div>
      {children(printer)}
    </div>
  );
}

export function ToolsPrinterMacGuard({
  macAddress,
  children,
}: {
  macAddress: string | null;
  children: React.ReactNode;
}) {
  if (!macAddress) {
    return (
      <EmptyState
        compact
        title="MAC requerida"
        description="Registre la dirección MAC de la impresora en el catálogo antes de usar operaciones MQTT."
      />
    );
  }
  return <>{children}</>;
}
