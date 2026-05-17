import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { PrintersManager } from "@/components/printers/printers-manager";

export default function PrintersPage() {
  return (
    <AdminShell
      title="Impresoras"
      description="Inventario de equipos fiscales por serial y asignación"
    >
      <RoleGuard path="/printers">
        <PrintersManager />
      </RoleGuard>
    </AdminShell>
  );
}
