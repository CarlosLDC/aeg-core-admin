import { AdminShell } from "@/components/admin/admin-shell";
import { EmployeeView } from "@/components/employees/employee-view";

export default function EmployeeDetailPage() {
  return (
    <AdminShell title="Empleado" description="Detalle de empleado">
      <EmployeeView />
    </AdminShell>
  );
}
