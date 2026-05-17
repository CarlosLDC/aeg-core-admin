import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ContractsManager } from "@/components/contracts/contracts-manager";

export default function ContractsPage() {
  return (
    <AdminShell
      title="Contratos"
      description="Contratos de distribuidora y centro de servicio"
    >
      <RoleGuard path="/contracts">
        <ContractsManager />
      </RoleGuard>
    </AdminShell>
  );
}
