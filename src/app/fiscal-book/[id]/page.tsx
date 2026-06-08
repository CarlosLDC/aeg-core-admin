import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { FiscalBookDetail } from "@/components/fiscal-book/fiscal-book-detail";

export default async function FiscalBookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const printerId = Number(id);

  return (
    <Suspense
      fallback={
        <main className="flex flex-1 flex-col items-center justify-center py-32 text-center">
          <Loader2 className="mb-4 size-12 animate-spin text-accent" />
          <p className="font-medium text-muted">Cargando libro fiscal…</p>
        </main>
      }
    >
      <FiscalBookDetail printerId={printerId} />
    </Suspense>
  );
}
