import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type PrinterFirmwareUnverifiedBannerProps = {
  currentFirmwareVersion?: string | null;
  className?: string;
};

export function PrinterFirmwareUnverifiedBanner({
  currentFirmwareVersion,
  className,
}: PrinterFirmwareUnverifiedBannerProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-900 dark:border-sky-500/20 dark:bg-sky-950/30 dark:text-sky-200",
        className,
      )}
    >
      <HelpCircle className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
      <p className="text-xs">
        Se lanzó una actualización de firmware y la impresora no respondió al verificarla, por lo que
        probablemente la versión actual ha cambiado. Versión registrada:{" "}
        <span className="font-mono font-medium">{currentFirmwareVersion?.trim() || "No especificada"}</span>.
      </p>
    </div>
  );
}