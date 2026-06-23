"use client";

import { Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getSession } from "@/lib/auth";
import { isRemembered } from "@/lib/auth-storage";
import {
  fiscalBooksHandoffUrl,
  fiscalBooksTargetPath,
} from "@/lib/fiscal-books-handoff";
import { FISCAL_BOOK_ENTRY_PATH } from "@/lib/safe-redirect";

export default function FiscalBookHandoffPage() {
  const router = useRouter();
  const params = useParams<{ path?: string[] }>();
  const pathSegments = Array.isArray(params.path) ? params.path : undefined;

  useEffect(() => {
    const session = getSession();
    const redirectPath =
      pathSegments?.length
        ? `${FISCAL_BOOK_ENTRY_PATH}/${pathSegments.join("/")}`
        : FISCAL_BOOK_ENTRY_PATH;

    if (!session) {
      router.replace(
        `/login?redirect=${encodeURIComponent(redirectPath)}`,
      );
      return;
    }

    const target = fiscalBooksTargetPath(pathSegments);
    window.location.replace(
      fiscalBooksHandoffUrl(target, session.token, isRemembered()),
    );
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
