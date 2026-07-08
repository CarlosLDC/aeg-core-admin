import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ToolsMigrationPlaceholder } from "@/components/tools/tools-migration-placeholder";

export default function ToolsPrinterDetailPage() {
  return (
    <AdminShell
      title="AEG Tools"
      description="Detalle de impresora para operaciones de campo y accesos a módulos MQTT."
    >
      <RoleGuard path="/tools">
        <ToolsMigrationPlaceholder
          title="Detalle de impresora"
          message="Aquí vivirá el shell del detalle de impresora con accesos a reimpresión, Reporte Z, WiFi, formas de pago y otros flujos de operación."
          moduleIds={[
            "tools-printer-detail",
            "tools-reprint",
            "tools-report-x",
            "tools-header-footer",
          ]}
        />
      </RoleGuard>
    </AdminShell>
  );
}
