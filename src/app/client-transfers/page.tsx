import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ClientTransfersManager } from "@/components/clients/client-transfers-manager";

export default function ClientTransfersPage() {
  return (
    <AdminShell
      title="Transferir cliente"
      description="Reasigna clientes entre distribuidoras."
    >
      <RoleGuard allow={["ADMIN"]}>
        <ClientTransfersManager />
      </RoleGuard>
    </AdminShell>
  );
}
