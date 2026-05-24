import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ClientModificationRequestView } from "@/components/clients/client-modification-request-view";

export default function ClientReviewDetailPage() {
  return (
    <AdminShell
      title="Detalle de solicitud"
      description="Compara el estado actual contra la propuesta antes de aprobar."
    >
      <RoleGuard allow={["ADMIN"]}>
        <ClientModificationRequestView />
      </RoleGuard>
    </AdminShell>
  );
}
