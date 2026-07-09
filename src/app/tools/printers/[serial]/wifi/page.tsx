"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ToolsPrinterSubPage } from "@/components/tools/tools-printer-sub-page";
import { ToolsWifiPanel } from "@/components/tools/tools-wifi-panel";
import { toolsPageTitle } from "@/lib/tools-page-titles";

export default function ToolsPrinterWifiPage() {
  return (
    <AdminShell title={toolsPageTitle("Configuración WiFi")}>
      <RoleGuard path="/tools">
        <ToolsPrinterSubPage>
          {(printer) => <ToolsWifiPanel printer={printer} />}
        </ToolsPrinterSubPage>
      </RoleGuard>
    </AdminShell>
  );
}
