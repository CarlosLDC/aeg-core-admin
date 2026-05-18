import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { TechnicalServiceView } from "@/components/technical-services/technical-service-view";

export default function TechnicalServiceDetailPage() {
  return (
    <AdminShell title="Servicio técnico" description="Detalle del servicio">
      <RoleGuard path="/technical-services">
        <TechnicalServiceView />
      </RoleGuard>
    </AdminShell>
  );
}
