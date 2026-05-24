"use client";

import { useParams } from "next/navigation";
import { ClientModificationRequestView } from "@/components/clients/client-modification-request-view";
import { EmployeeModificationRequestView } from "@/components/employees/employee-modification-request-view";

export function ModificationReviewDetailView() {
  const params = useParams<{ section?: string }>();
  const section = params?.section;

  if (section === "employees") {
    return <EmployeeModificationRequestView backHref="/reviews?section=employees" />;
  }
  if (section === "clients") {
    return <ClientModificationRequestView backHref="/reviews?section=clients" />;
  }
  return (
    <p
      role="alert"
      className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
    >
      Sección de revisión no válida.
    </p>
  );
}
