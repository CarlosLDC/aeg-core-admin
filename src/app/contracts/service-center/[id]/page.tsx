import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ContractView } from "@/components/contracts/contract-view";

export default function ServiceCenterContractDetailPage() {
  return (
    <AdminShell
      title="Contrato"
      description="Contrato de centro de servicio"
    >
      <RoleGuard path="/contracts">
        <ContractView kind="serviceCenter" />
      </RoleGuard>
    </AdminShell>
  );
}
