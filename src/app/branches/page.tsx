import { AdminShell } from "@/components/admin/admin-shell";
import { BranchesManager } from "@/components/branches/branches-manager";

export default function BranchesPage() {
  return (
    <AdminShell
      title="Sucursales"
      description="Sucursales por empresa y tipo de operación"
    >
      <BranchesManager />
    </AdminShell>
  );
}
