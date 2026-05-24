import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ClientModificationRequestsManager } from "@/components/clients/client-modification-requests-manager";

export default function ClientReviewsPage() {
  return (
    <AdminShell
      title="Solicitudes de clientes"
      description="Revisa y decide cambios pendientes enviados por distribuidores."
    >
      <RoleGuard allow={["ADMIN"]}>
        <ClientModificationRequestsManager />
      </RoleGuard>
    </AdminShell>
  );
}
