import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ClientDetailRedirect } from "@/components/clients/client-detail-redirect";

export default function ClientDetailPage() {
  return (
    <AdminShell title="Empresa" description="Redirigiendo al detalle de empresa…">
      <RoleGuard path="/clients">
        <ClientDetailRedirect />
      </RoleGuard>
    </AdminShell>
  );
}
