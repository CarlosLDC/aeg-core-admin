import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { EmployeeModificationRequestsManager } from "@/components/employees/employee-modification-requests-manager";

export default function EmployeeReviewsPage() {
  return (
    <AdminShell
      title="Solicitudes de empleados"
      description="Revisa y decide cambios pendientes enviados por distribuidores."
    >
      <RoleGuard allow={["ADMIN"]}>
        <EmployeeModificationRequestsManager />
      </RoleGuard>
    </AdminShell>
  );
}
