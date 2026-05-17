import { AdminShell } from "@/components/admin/admin-shell";
import { DashboardManager } from "@/components/dashboard/dashboard-manager";

export default function DashboardPage() {
  return (
    <AdminShell
      title="Dashboard"
      description="Vista general de tu negocio"
    >
      <DashboardManager />
    </AdminShell>
  );
}
