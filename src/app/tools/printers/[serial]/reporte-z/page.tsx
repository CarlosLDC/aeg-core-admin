"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ToolsPrinterSubPage } from "@/components/tools/tools-printer-sub-page";
import { ToolsReporteZPanel } from "@/components/tools/tools-reporte-z-panel";

export default function ToolsPrinterReporteZPage() {
  return (
    <AdminShell
      title="AEG Tools"
      description="Reportes Z y transmisión SENIAT."
    >
      <RoleGuard path="/tools">
        <ToolsPrinterSubPage
          title="Reporte Z"
          description="Generar, consultar y transmitir reportes Z"
        >
          {(printer) => <ToolsReporteZPanel printer={printer} />}
        </ToolsPrinterSubPage>
      </RoleGuard>
    </AdminShell>
  );
}
