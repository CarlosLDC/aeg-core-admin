import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ModificationReviewDetailView } from "@/components/reviews/modification-review-detail-view";

export default function UnifiedReviewDetailPage() {
  return (
    <AdminShell
      title="Detalle de solicitud"
      description="Compara el estado actual contra la propuesta antes de aprobar."
    >
      <RoleGuard allow={["ADMIN"]}>
        <ModificationReviewDetailView />
      </RoleGuard>
    </AdminShell>
  );
}
