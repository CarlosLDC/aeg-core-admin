"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ToolsHeaderFooterPanel } from "@/components/tools/tools-header-footer-panel";
import { ToolsPrinterSubPage } from "@/components/tools/tools-printer-sub-page";
import { toolsPageTitle } from "@/lib/tools-page-titles";
import { TOOLS_SECTIONS } from "@/lib/tools-sections";

export default function ToolsPrinterHeaderFooterPage() {
  const section = TOOLS_SECTIONS.headerFooter;

  return (
    <AdminShell title={toolsPageTitle(section.title)}>
      <RoleGuard path="/tools">
        <ToolsPrinterSubPage>
          {(printer) => <ToolsHeaderFooterPanel printer={printer} />}
        </ToolsPrinterSubPage>
      </RoleGuard>
    </AdminShell>
  );
}
