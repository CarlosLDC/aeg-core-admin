"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ToolsPrinterSubPage } from "@/components/tools/tools-printer-sub-page";
import { ToolsReporteZPanel } from "@/components/tools/tools-reporte-z-panel";
import { toolsPageTitle } from "@/lib/tools-page-titles";

export default function ToolsPrinterReporteZPage() {
  return (
    <AdminShell title={toolsPageTitle("Reporte Z")}>
      <RoleGuard path="/tools">
        <ToolsPrinterSubPage>
          {(printer) => <ToolsReporteZPanel printer={printer} />}
        </ToolsPrinterSubPage>
      </RoleGuard>
    </AdminShell>
  );
}
