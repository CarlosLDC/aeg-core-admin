import type { DashboardSnapshot } from "@/lib/dashboard-data";
import type { Role } from "@/types/user";

type DashboardScopeSummaryProps = {
  role: Role;
  snapshot: DashboardSnapshot;
};

export function DashboardScopeSummary({
  role,
  snapshot,
}: DashboardScopeSummaryProps) {
  const messages: Record<Role, string> = {
    ADMIN: "Vista global del catálogo operativo y flota de impresoras.",
    DISTRIBUTOR: "Resumen de tu red: impresoras y clientes asignados.",
    TECHNICIAN: "Equipos fiscales y personal en tu ámbito de trabajo.",
    SERVICE_CENTER: "Empresas, sucursales y personal de tu centro.",
  };

  const printerNote =
    snapshot.printers.length > 0
      ? `${snapshot.printers.length} impresora${snapshot.printers.length === 1 ? "" : "s"} en el resumen.`
      : role === "SERVICE_CENTER"
        ? "Tu rol no gestiona impresoras directamente."
        : "Aún no hay impresoras en tu ámbito.";

  return (
    <p className="text-sm text-muted">
      {messages[role]} {printerNote}
    </p>
  );
}
