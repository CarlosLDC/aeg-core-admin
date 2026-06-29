"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getSession } from "@/lib/auth";
import { isRemembered } from "@/lib/auth-storage";
import { canAccessFiscalBooksApp } from "@/lib/fiscal-books-app";
import { completeFiscalBooksHandoffFromAdmin } from "@/lib/fiscal-books-handoff";
import { FISCAL_BOOK_ENTRY_PATH } from "@/lib/safe-redirect";

type FiscalBookHandoffProps = {
  pathSegments?: string[];
};

export function FiscalBookHandoff({ pathSegments }: FiscalBookHandoffProps) {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    const redirectPath = pathSegments?.length
      ? `${FISCAL_BOOK_ENTRY_PATH}/${pathSegments.join("/")}`
      : FISCAL_BOOK_ENTRY_PATH;

    if (!session) {
      router.replace(
        `/login?redirect=${encodeURIComponent(redirectPath)}`,
      );
      return;
    }

    const isSeniat = session.role === "SENIAT";
    if (!isSeniat && !canAccessFiscalBooksApp(session.role)) {
      router.replace("/");
      return;
    }

    completeFiscalBooksHandoffFromAdmin({
      token: session.token,
      remember: isRemembered(),
      pathSegments,
      adminPath: redirectPath,
      clearAdminSession: isSeniat,
    });
  }, [router, pathSegments]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="size-8 animate-spin text-accent" aria-hidden />
        <p className="text-sm text-muted">Abriendo libro fiscal…</p>
      </div>
    </div>
  );
}
