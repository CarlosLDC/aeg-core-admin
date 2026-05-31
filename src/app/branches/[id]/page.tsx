import { AdminShell } from "@/components/admin/admin-shell";
import { BranchView } from "@/components/branches/branch-view";

export default function BranchDetailPage() {
  return (
    <AdminShell title="Empresa" description="Detalle de empresa">
      <BranchView />
    </AdminShell>
  );
}
