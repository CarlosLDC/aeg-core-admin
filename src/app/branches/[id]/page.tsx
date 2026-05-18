import { AdminShell } from "@/components/admin/admin-shell";
import { BranchView } from "@/components/branches/branch-view";

export default function BranchDetailPage() {
  return (
    <AdminShell title="Sucursal" description="Detalle de sucursal">
      <BranchView />
    </AdminShell>
  );
}
