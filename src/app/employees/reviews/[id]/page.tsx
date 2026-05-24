import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { EmployeeModificationRequestView } from "@/components/employees/employee-modification-request-view";

export default function EmployeeReviewDetailPage() {
  return (
    <AdminShell
      title="Detalle de solicitud"
      description="Compara el estado actual contra la propuesta antes de aprobar."
    >
      <RoleGuard allow={["ADMIN"]}>
        <EmployeeModificationRequestView />
      </RoleGuard>
    </AdminShell>
  );
}
