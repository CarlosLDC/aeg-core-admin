import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { TechnicalServicesManager } from "@/components/technical-services/technical-services-manager";

export default function TechnicalServicesPage() {
  return (
    <AdminShell
      title="Servicio técnico"
      description="Visitas de servicio, reportes Z y gestión de precintos en campo"
    >
      <RoleGuard path="/technical-services">
        <TechnicalServicesManager />
      </RoleGuard>
    </AdminShell>
  );
}
