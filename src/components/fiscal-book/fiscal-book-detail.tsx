"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Filter,
  Loader2,
  Menu,
  Plus,
  X,
} from "lucide-react";
import { FiscalBookEmptyState } from "@/components/fiscal-book/empty-state";
import { FiscalBookInfoPage } from "@/components/fiscal-book/info-page";
import { FiscalBookInspectionSheet } from "@/components/fiscal-book/inspection-sheet";
import { FiscalBookTechSheet } from "@/components/fiscal-book/tech-sheet";
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import { fetchAuthMe } from "@/lib/auth-me-api";
import {
  canCreateAnnualInspectionRecord,
  canCreateTechnicalServiceRecord,
} from "@/lib/api-permissions";
import { formatRegistroCreado } from "@/lib/fiscal-book/fiscal-helpers";
import { downloadFiscalBookPdf } from "@/lib/fiscal-book/fiscal-book-pdf";
import { loadFiscalPrinter } from "@/lib/fiscal-book/load-fiscal-printer";
import type {
  FiscalAnnualInspection,
  FiscalPrinter,
  TechnicalReview,
} from "@/lib/fiscal-book/types";
import { fiscalBookSearchPath } from "@/lib/resource-routes";
import { cn } from "@/lib/utils";

type ViewMode = "info" | "tech" | "inspection";

export function FiscalBookDetail({ printerId }: { printerId: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { scope } = useCompanyScope();
  const [distributorId, setDistributorId] = useState<number | null>(
    user?.distributorId ?? null,
  );
  const [printer, setPrinter] = useState<FiscalPrinter | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("info");
  const [currentPage, setCurrentPage] = useState(0);
  const [techFilterQuery, setTechFilterQuery] = useState("");
  const [techFilterYear, setTechFilterYear] = useState("all");
  const [inspFilterQuery, setInspFilterQuery] = useState("");
  const [inspFilterYear, setInspFilterYear] = useState("all");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const canCreateService = user
    ? canCreateTechnicalServiceRecord(user.role)
    : false;
  const canCreateInspection = user
    ? canCreateAnnualInspectionRecord(user.role)
    : false;

  useEffect(() => {
    if (!user || user.distributorId != null) return;
    if (user.role !== "DISTRIBUTOR") return;
    fetchAuthMe()
      .then((me) => setDistributorId(me.distributorId ?? null))
      .catch(() => setDistributorId(null));
  }, [user]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await loadFiscalPrinter(printerId, {
        role: user.role,
        scope,
        distributorId,
        userBranchId: user.branchId,
      });
      setPrinter(data);
    } finally {
      setLoading(false);
    }
  }, [printerId, user, scope, distributorId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!printer) return;
    const tab = searchParams.get("tab");
    const registro = searchParams.get("registro");
    if (tab !== "tech" && tab !== "inspection") return;
    setViewMode(tab);
    const fullList =
      tab === "tech" ? printer.technicalReviews : printer.annualInspections;
    let idx = 0;
    if (registro) {
      const i = fullList.findIndex((r) => r.id === registro);
      if (i >= 0) idx = i;
    }
    setCurrentPage(idx);
    router.replace(`/fiscal-book/${printerId}`, { scroll: false });
  }, [printer, searchParams, printerId, router]);

  const filteredTechRecords = useMemo(() => {
    if (!printer) return [];
    let list = printer.technicalReviews;
    if (techFilterYear !== "all") {
      list = list.filter((r) => {
        const src = r.createdAt || r.date;
        return src && String(src).startsWith(techFilterYear);
      });
    }
    const q = techFilterQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          (r.description || "").toLowerCase().includes(q) ||
          (r.technician || "").toLowerCase().includes(q) ||
          (r.serviceCenter || "").toLowerCase().includes(q) ||
          String(r.id).includes(q),
      );
    }
    return list;
  }, [printer, techFilterYear, techFilterQuery]);

  const filteredInspectionRecords = useMemo(() => {
    if (!printer) return [];
    let list = printer.annualInspections;
    if (inspFilterYear !== "all") {
      list = list.filter((r) => {
        const src = r.createdAt || r.date;
        return src && String(src).startsWith(inspFilterYear);
      });
    }
    const q = inspFilterQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          (r.observations || "").toLowerCase().includes(q) ||
          (r.inspector || "").toLowerCase().includes(q) ||
          (r.serviceCenter || "").toLowerCase().includes(q) ||
          String(r.id).includes(q),
      );
    }
    return list;
  }, [printer, inspFilterYear, inspFilterQuery]);

  const records =
    viewMode === "tech"
      ? filteredTechRecords
      : viewMode === "inspection"
        ? filteredInspectionRecords
        : [];
  const totalPages = viewMode === "info" ? 1 : records.length;
  const currentRecord =
    viewMode !== "info" && totalPages > 0
      ? (records[currentPage] ?? null)
      : null;

  useEffect(() => {
    if (viewMode === "info") return;
    if (totalPages === 0) {
      if (currentPage !== 0) setCurrentPage(0);
      return;
    }
    if (currentPage > totalPages - 1) setCurrentPage(totalPages - 1);
  }, [viewMode, totalPages, currentPage]);

  if (loading) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center py-32 text-center">
        <Loader2 className="mb-4 size-12 animate-spin text-accent" />
        <p className="font-medium text-muted">Cargando Libro Fiscal...</p>
      </main>
    );
  }

  if (!printer) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center py-32 text-center">
        <h1 className="mb-4 text-3xl font-bold">Equipo no encontrado</h1>
        <Link href={fiscalBookSearchPath()} className="text-accent hover:underline">
          ← Volver a búsqueda
        </Link>
      </main>
    );
  }

  const createHref =
    viewMode === "tech"
      ? `/technical-services?printerId=${printerId}&action=create`
      : `/annual-inspections?printerId=${printerId}&action=create`;

  async function handleDownload() {
    if (!printer || (viewMode !== "info" && !currentRecord)) return;
    setIsDownloading(true);
    try {
      await downloadFiscalBookPdf(
        printer,
        viewMode,
        currentRecord as TechnicalReview | FiscalAnnualInspection | null,
      );
    } finally {
      setIsDownloading(false);
    }
  }

  const tabs = (
    <div className="flex w-full snap-x overflow-x-auto rounded-xl bg-foreground/[0.04] p-1 md:w-auto">
      {(
        [
          ["info", "Inf. Base"],
          ["tech", `Servicios (${printer.technicalReviews.length})`],
          ["inspection", `Inspecciones (${printer.annualInspections.length})`],
        ] as const
      ).map(([mode, label]) => (
        <button
          key={mode}
          type="button"
          onClick={() => {
            setViewMode(mode);
            setCurrentPage(0);
          }}
          className={cn(
            "flex-1 snap-start whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors md:flex-none",
            viewMode === mode
              ? "bg-card text-card-foreground shadow-sm"
              : "text-muted hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-[900px] flex-col items-center px-2 pb-16 pt-6 md:pt-8">
      <div className="no-print sticky top-[52px] z-40 mb-6 w-full rounded-2xl border border-border bg-card/90 p-3 shadow-sm backdrop-blur-md md:mb-8">
        <div className="flex w-full items-center justify-between">
          <Link
            href={fiscalBookSearchPath()}
            className="inline-flex items-center gap-2 pl-2 text-sm text-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Volver
          </Link>
          <div className="hidden md:block">{tabs}</div>
          <button
            type="button"
            className="rounded-lg border border-border p-2 md:hidden"
            onClick={() => setIsMobileMenuOpen((v) => !v)}
          >
            {isMobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
        {isMobileMenuOpen ? (
          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 md:hidden">
            {tabs}
          </div>
        ) : null}
        {viewMode !== "info" ? (
          <div className="mt-3 flex items-center justify-end gap-2 border-t border-border pt-3">
            {totalPages > 0 ? (
              <div className="flex items-center rounded-xl border border-border bg-foreground/[0.03] p-1">
                <button
                  type="button"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="flex size-7 items-center justify-center rounded-lg disabled:opacity-30"
                >
                  <ArrowLeft className="size-3.5" />
                </button>
                <span className="min-w-[58px] px-2 text-center font-mono text-[11px] font-bold tabular-nums">
                  {String(currentPage + 1).padStart(2, "0")} /{" "}
                  {String(totalPages).padStart(2, "0")}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="flex size-7 items-center justify-center rounded-lg disabled:opacity-30"
                >
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setIsFiltersOpen((v) => !v)}
              className="flex size-7 items-center justify-center rounded-lg border border-border"
            >
              <Filter className="size-3.5" />
            </button>
            {(viewMode === "tech" && canCreateService) ||
            (viewMode === "inspection" && canCreateInspection) ? (
              <Link
                href={createHref}
                className="flex size-7 items-center justify-center rounded-lg border border-border"
              >
                <Plus className="size-3.5" />
              </Link>
            ) : null}
            <button
              type="button"
              disabled={isDownloading || records.length === 0}
              onClick={() => void handleDownload()}
              className="flex size-7 items-center justify-center rounded-lg border border-border disabled:opacity-40"
            >
              {isDownloading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
            </button>
          </div>
        ) : null}
        {isFiltersOpen && viewMode !== "info" ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <input
              type="search"
              placeholder={
                viewMode === "tech"
                  ? "Buscar servicio..."
                  : "Buscar inspección..."
              }
              value={viewMode === "tech" ? techFilterQuery : inspFilterQuery}
              onChange={(e) => {
                const v = e.target.value;
                if (viewMode === "tech") setTechFilterQuery(v);
                else setInspFilterQuery(v);
                setCurrentPage(0);
              }}
              className="min-w-[160px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        ) : null}
      </div>

      <div className="print-container w-full overflow-x-auto border border-border bg-card shadow-xl md:max-w-[21.59cm]">
        <div className="print-content relative z-10 flex flex-col px-6 py-8 md:px-16 md:py-14">
          <div className="mb-10 flex flex-col items-start justify-between gap-4 border-b border-foreground pb-6 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight md:text-2xl">
                Libro Virtual de Control, Reparación y Mantenimiento
              </h1>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                Máquina Fiscal - Providencia SENIAT 0141
              </p>
            </div>
            <div className="rounded-lg border border-border bg-foreground/[0.02] px-4 py-2 text-right shadow-sm">
              <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-muted">
                Serial Fiscal
              </span>
              <span className="font-mono text-base font-black leading-none">
                {printer.fiscalSerial}
              </span>
            </div>
          </div>

          {viewMode === "info" ? <FiscalBookInfoPage printer={printer} /> : null}
          {viewMode === "tech" ? (
            currentRecord ? (
              <>
                <MetaBadges
                  currentPage={currentPage}
                  totalPages={totalPages}
                  recordId={currentRecord.id}
                  createdAt={(currentRecord as TechnicalReview).createdAt}
                />
                <FiscalBookTechSheet
                  review={currentRecord as TechnicalReview}
                  printer={printer}
                />
              </>
            ) : (
              <FiscalBookEmptyState
                type="services"
                filtered={
                  printer.technicalReviews.length > 0 && records.length === 0
                }
              />
            )
          ) : null}
          {viewMode === "inspection" ? (
            currentRecord ? (
              <>
                <MetaBadges
                  currentPage={currentPage}
                  totalPages={totalPages}
                  recordId={currentRecord.id}
                  createdAt={(currentRecord as FiscalAnnualInspection).createdAt}
                />
                <FiscalBookInspectionSheet
                  inspection={currentRecord as FiscalAnnualInspection}
                />
              </>
            ) : (
              <FiscalBookEmptyState
                type="inspections"
                filtered={
                  printer.annualInspections.length > 0 && records.length === 0
                }
              />
            )
          ) : null}
        </div>
      </div>
    </main>
  );
}

function MetaBadges({
  currentPage,
  totalPages,
  recordId,
  createdAt,
}: {
  currentPage: number;
  totalPages: number;
  recordId: string;
  createdAt?: string | null;
}) {
  return (
    <div className="no-print mb-6 flex flex-wrap items-center gap-2 text-[11px]">
      <span className="inline-flex items-center rounded-md bg-foreground px-2.5 py-1 font-mono font-bold tabular-nums text-background">
        Pág. {String(currentPage + 1).padStart(2, "0")} /{" "}
        {String(totalPages).padStart(2, "0")}
      </span>
      <span className="inline-flex items-center rounded-md border border-border bg-foreground/[0.02] px-2.5 py-1 font-mono">
        Registro #{recordId}
      </span>
      {createdAt ? (
        <span className="inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-800 dark:text-emerald-200">
          Creado: {formatRegistroCreado(createdAt)}
        </span>
      ) : null}
    </div>
  );
}
