import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ModificationReviewsManager } from "@/components/reviews/modification-reviews-manager";

export default function ReviewsPage() {
  return (
    <AdminShell
      title="Revisiones"
      description="Gestiona en una sola bandeja las solicitudes pendientes de empleados y clientes."
    >
      <RoleGuard allow={["ADMIN"]}>
        <ModificationReviewsManager />
      </RoleGuard>
    </AdminShell>
  );
}
