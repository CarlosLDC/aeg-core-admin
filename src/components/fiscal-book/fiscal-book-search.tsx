"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import { fetchAuthMe } from "@/lib/auth-me-api";
import {
  FISCAL_RIF_REGEX,
  FISCAL_SERIAL_REGEX,
} from "@/lib/fiscal-book/fiscal-helpers";
import { searchFiscalPrinters } from "@/lib/fiscal-book/search-fiscal-printers";
import type { FiscalBookSearchType, FiscalPrinter } from "@/lib/fiscal-book/types";
import { fiscalBookPath } from "@/lib/resource-routes";
import { cn } from "@/lib/utils";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

export function FiscalBookSearch() {
  const router = useRouter();
  const { user } = useAuth();
  const { scope } = useCompanyScope();
  const [distributorId, setDistributorId] = useState<number | null>(
    user?.distributorId ?? null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<FiscalBookSearchType>("serial");
  const [searchedType, setSearchedType] =
    useState<FiscalBookSearchType>("serial");
  const [results, setResults] = useState<FiscalPrinter[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (!user || user.distributorId != null) return;
    if (user.role !== "DISTRIBUTOR") return;
    fetchAuthMe()
      .then((me) => setDistributorId(me.distributorId ?? null))
      .catch(() => setDistributorId(null));
  }, [user]);

  const performSearch = useCallback(
    async (page: number, isNewSearch: boolean, pageSizeOverride?: number) => {
      if (!user) return;
      const effectiveType = isNewSearch ? searchType : searchedType;
      const size = pageSizeOverride ?? pageSize;
      setLoading(true);
      if (isNewSearch) {
        setHasSearched(false);
        setResults([]);
      }
      try {
        const { data, count } = await searchFiscalPrinters(
          searchTerm,
          effectiveType,
          page,
          size,
          { role: user.role, scope, distributorId },
        );

        if (
          isNewSearch &&
          effectiveType === "serial" &&
          searchTerm.trim() &&
          count === 1 &&
          data.length === 1
        ) {
          router.push(fiscalBookPath(Number(data[0].id)));
          return;
        }

        if (isNewSearch && effectiveType === "serial" && count === 0) {
          setErrorMessage(
            "No se encontró ningún equipo fiscal con el serial indicado.",
          );
          setHasSearched(true);
          setResults([]);
          setTotalCount(0);
          return;
        }

        if (isNewSearch) setHasSearched(true);
        setResults(data);
        setTotalCount(count);
        setCurrentPage(page);
      } finally {
        setLoading(false);
      }
    },
    [
      user,
      searchType,
      searchedType,
      searchTerm,
      pageSize,
      scope,
      distributorId,
      router,
    ],
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    const normalized = searchTerm.trim().toUpperCase();
    if (normalized) {
      if (searchType === "serial" && !FISCAL_SERIAL_REGEX.test(normalized)) {
        setErrorMessage(
          "El serial fiscal debe tener el formato: 3 letras mayúsculas seguidas de 7 dígitos (ej: GRA0000123).",
        );
        return;
      }
      if (searchType === "rif" && !FISCAL_RIF_REGEX.test(normalized)) {
        setErrorMessage(
          "El RIF debe tener el formato: V/E/J/P/G seguido de 7-9 dígitos (ej: J12345678).",
        );
        return;
      }
    }
    setSearchedType(searchType);
    void performSearch(1, true);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <main className="mx-auto flex max-w-4xl flex-1 flex-col justify-center px-6 py-12 md:py-20">
      <div className="mb-16 space-y-4 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
          Auditoría de Equipo Fiscal
        </h1>
        <p className="mx-auto max-w-2xl text-lg font-light leading-relaxed text-muted md:text-xl">
          Verificación del historial de mantenimiento y estatus operativo en la
          red AEG, conforme a la Providencia SENIAT 0141.
        </p>
      </div>

      <div className="relative mb-16 overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm md:rounded-3xl md:p-10">
        <form
          onSubmit={handleSearch}
          className="relative z-10 flex flex-col items-center gap-4 md:flex-row"
        >
          <div className="flex h-14 w-full rounded-xl border border-border bg-foreground/[0.03] p-1 md:w-auto">
            {(["serial", "rif"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSearchType(type)}
                className={cn(
                  "flex-1 rounded-lg px-4 text-sm font-medium transition-all md:w-36",
                  searchType === type
                    ? "bg-card text-card-foreground shadow-sm"
                    : "text-muted hover:text-foreground",
                )}
              >
                {type === "serial" ? "Serial" : "RIF"}
              </button>
            ))}
          </div>

          <div className="group relative w-full flex-1">
            <input
              type="text"
              placeholder={
                searchType === "serial" ? "Ej: GRA0000123" : "Ej: J12345678"
              }
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
              }
              className="h-14 w-full rounded-xl border border-border bg-foreground/[0.02] px-5 font-mono text-lg outline-none transition-all focus:border-accent focus:ring-4 focus:ring-ring/20"
            />
            <Search className="absolute right-5 top-1/2 size-5 -translate-y-1/2 text-muted" />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-14 min-w-[150px] items-center justify-center gap-2 rounded-xl bg-accent px-8 font-semibold text-accent-foreground shadow-sm transition-all hover:opacity-90 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Buscando...
              </>
            ) : (
              "Buscar"
            )}
          </button>
        </form>
        {errorMessage ? (
          <p className="mt-4 text-sm text-rose-600">{errorMessage}</p>
        ) : null}
      </div>

      {hasSearched && results.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {totalCount} equipo{totalCount === 1 ? "" : "s"} encontrado
            {totalCount === 1 ? "" : "s"}
          </p>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {results.map((printer) => (
              <li key={printer.id}>
                <Link
                  href={fiscalBookPath(Number(printer.id))}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-foreground/[0.03]"
                >
                  <div>
                    <p className="font-mono font-bold">{printer.fiscalSerial}</p>
                    <p className="text-sm text-muted">
                      {printer.businessName || "Sin contribuyente"}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1 || loading}
                onClick={() => void performSearch(currentPage - 1, false)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-sm text-muted">
                Página {currentPage} de {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages || loading}
                onClick={() => void performSearch(currentPage + 1, false)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {hasSearched && results.length === 0 && !errorMessage && !loading ? (
        <p className="text-center text-muted">
          No hay equipos que coincidan con la búsqueda.
        </p>
      ) : null}
    </main>
  );
}
