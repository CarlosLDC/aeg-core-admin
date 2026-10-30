import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { toolsPrinterBrokerMigrationPath } from "@/lib/resource-routes";
import { CURRENT_FIRMWARE_VERSION } from "@/lib/firmware-update-policy";
import { cn } from "@/lib/utils";

type PrinterFirmwareUpdateBannerProps = {
  serial?: string | null;
  currentFirmwareVersion?: string | null;
  className?: string;
};

export function PrinterFirmwareUpdateBanner({
  serial,
  currentFirmwareVersion,
  className,
}: PrinterFirmwareUpdateBannerProps) {
  const targetPath = serial ? toolsPrinterBrokerMigrationPath(serial) : null;

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-950/30 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        <div>
          <p className="font-semibold text-amber-950 dark:text-amber-100">
            Esta impresora requiere actualización de firmware
          </p>
          <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
            Versión registrada:{" "}
            <span className="font-mono font-medium">
              {currentFirmwareVersion?.trim() || "No especificada"}
            </span>{" "}
            · Versión actual requerida:{" "}
            <span className="font-mono font-medium">{CURRENT_FIRMWARE_VERSION}</span>.
          </p>
        </div>
      </div>

      {targetPath ? (
        <Link
          href={targetPath}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-amber-500/30 bg-card/80 px-3 py-1.5 text-xs font-semibold text-card-foreground shadow-sm hover:bg-card hover:text-foreground"
        >
          Actualizar firmware
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
