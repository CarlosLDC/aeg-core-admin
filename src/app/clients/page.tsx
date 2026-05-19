import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ClientsManager } from "@/components/clients/clients-manager";

export default function ClientsPage() {
  return (
    <AdminShell
      title="Clientes"
      description="Alta de clientes con documento fiscal (SENIAT) y datos de contacto"
    >
      <RoleGuard path="/clients">
        <ClientsManager />
      </RoleGuard>
    </AdminShell>
  );
}
