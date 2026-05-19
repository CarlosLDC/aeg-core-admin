import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted">
      <Loader2 className="size-5 animate-spin" aria-hidden />
      <span className="text-sm">Cargando…</span>
    </div>
  );
}
