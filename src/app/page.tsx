import { AdminShell } from "@/components/admin/admin-shell";
import { DashboardManager } from "@/components/dashboard/dashboard-manager";

export default function DashboardPage() {
  return (
    <AdminShell
      title="Dashboard"
      description="Indicadores, flota fiscal y actividad reciente"
    >
      <DashboardManager />
    </AdminShell>
  );
}
