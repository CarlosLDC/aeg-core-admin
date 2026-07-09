"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ToolsPrinterSubPage } from "@/components/tools/tools-printer-sub-page";
import { ToolsTestDocumentsPanel } from "@/components/tools/tools-test-documents-panel";
import { toolsPageTitle } from "@/lib/tools-page-titles";
import { TOOLS_SECTIONS } from "@/lib/tools-sections";

export default function ToolsPrinterTestDocumentsPage() {
  const section = TOOLS_SECTIONS.testDocuments;

  return (
    <AdminShell title={toolsPageTitle(section.title)}>
      <RoleGuard path="/tools">
        <ToolsPrinterSubPage>
          {(printer) => <ToolsTestDocumentsPanel printer={printer} />}
        </ToolsPrinterSubPage>
      </RoleGuard>
    </AdminShell>
  );
}
