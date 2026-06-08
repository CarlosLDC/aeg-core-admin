import { FISCAL_BOOK_ROLE_LABELS, FISCAL_BOOK_ROLE_STYLES } from "@/lib/fiscal-book-roles";
import type { FiscalBookRole } from "@/types/fiscal-book-user";
import { cn } from "@/lib/utils";

export function FiscalBookRoleBadge({ role }: { role: FiscalBookRole }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
        FISCAL_BOOK_ROLE_STYLES[role],
      )}
    >
      {FISCAL_BOOK_ROLE_LABELS[role]}
    </span>
  );
}
