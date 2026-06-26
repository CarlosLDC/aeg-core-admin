"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useResourceId } from "@/hooks/use-resource-id";
import { fetchClientById, getClientsErrorMessage } from "@/lib/clients-api";
import { branchPath } from "@/lib/resource-routes";

/** Redirige rutas legacy /clients/:id al detalle de empresa. */
export function ClientDetailRedirect() {
  const id = useResourceId();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id == null) {
      setError("Identificador no válido.");
      return;
    }
    void fetchClientById(id)
      .then((client) => router.replace(branchPath(client.branchId)))
      .catch((err) =>
        setError(getClientsErrorMessage(err) || "Cliente no encontrado."),
      );
  }, [id, router]);

  if (error) {
    return (
      <p
        role="alert"
        className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
      >
        {error}
      </p>
    );
  }

  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="size-6 animate-spin text-muted" />
    </div>
  );
}
