import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ContractView } from "@/components/contracts/contract-view";

export default function DistributorContractDetailPage() {
  return (
    <AdminShell title="Contrato" description="Contrato de distribuidora">
      <RoleGuard path="/contracts">
        <ContractView kind="distributor" />
      </RoleGuard>
    </AdminShell>
  );
}
