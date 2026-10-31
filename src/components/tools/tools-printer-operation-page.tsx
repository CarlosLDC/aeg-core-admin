"use client";

import { useParams } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ToolsPrinterSubPage } from "@/components/tools/tools-printer-sub-page";
import { toolsPageTitle } from "@/lib/tools-page-titles";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import type { Role } from "@/types/user";

type ToolsPrinterOperationPageProps = {
  allow?: Role[];
  children: (printer: ToolsPrinter) => React.ReactNode;
};

export function ToolsPrinterOperationPage({
  allow,
  children,
}: ToolsPrinterOperationPageProps) {
  const params = useParams();
  const serial =
    typeof params.serial === "string" ? decodeURIComponent(params.serial) : "";

  return (
    <AdminShell title={toolsPageTitle(serial || undefined)}>
      <RoleGuard allow={allow} path={allow ? undefined : "/tools"}>
        <ToolsPrinterSubPage>{children}</ToolsPrinterSubPage>
      </RoleGuard>
    </AdminShell>
  );
}
