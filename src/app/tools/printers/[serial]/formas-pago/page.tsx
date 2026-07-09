"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ToolsPrinterSubPage } from "@/components/tools/tools-printer-sub-page";
import { ToolsFormasPagoPanel } from "@/components/tools/tools-formas-pago-panel";
import { toolsPageTitle } from "@/lib/tools-page-titles";

export default function ToolsPrinterFormasPagoPage() {
  return (
    <AdminShell title={toolsPageTitle("Formas de pago")}>
      <RoleGuard path="/tools">
        <ToolsPrinterSubPage>
          {(printer) => <ToolsFormasPagoPanel printer={printer} />}
        </ToolsPrinterSubPage>
      </RoleGuard>
    </AdminShell>
  );
}
