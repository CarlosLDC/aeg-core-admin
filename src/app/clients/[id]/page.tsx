import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ClientView } from "@/components/clients/client-view";

export default function ClientDetailPage() {
  return (
    <AdminShell title="Cliente" description="Detalle del cliente">
      <RoleGuard path="/clients">
        <ClientView />
      </RoleGuard>
    </AdminShell>
  );
}
