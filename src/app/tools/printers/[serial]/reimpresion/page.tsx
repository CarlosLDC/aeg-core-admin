"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ToolsPrinterSubPage } from "@/components/tools/tools-printer-sub-page";
import { ToolsReprintPanel } from "@/components/tools/tools-reprint-panel";
import { toolsPageTitle } from "@/lib/tools-page-titles";
import { TOOLS_SECTIONS } from "@/lib/tools-sections";

export default function ToolsPrinterReprintPage() {
  const section = TOOLS_SECTIONS.reprint;

  return (
    <AdminShell title={toolsPageTitle(section.title)}>
      <RoleGuard path="/tools">
        <ToolsPrinterSubPage>
          {(printer) => <ToolsReprintPanel printer={printer} />}
        </ToolsPrinterSubPage>
      </RoleGuard>
    </AdminShell>
  );
}
