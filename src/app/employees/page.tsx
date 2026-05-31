import { AdminShell } from "@/components/admin/admin-shell";
import { EmployeesManager } from "@/components/employees/employees-manager";

export default function EmployeesPage() {
  return (
    <AdminShell
      title="Empleados"
      description="Personal por empresa"
    >
      <EmployeesManager />
    </AdminShell>
  );
}
