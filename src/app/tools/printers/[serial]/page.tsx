import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ToolsPrinterDetailPageClient } from "@/components/tools/tools-printer-detail-page-client";

export default function ToolsPrinterDetailPage() {
  return (
    <AdminShell
      title="AEG Tools"
      description="Detalle de impresora para operaciones de campo."
    >
      <RoleGuard path="/tools">
        <ToolsPrinterDetailPageClient />
      </RoleGuard>
    </AdminShell>
  );
}
