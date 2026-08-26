"use client";

import Link from "next/link";
import { Plus, ShieldAlert, ShieldCheck } from "lucide-react";
import { DetailField } from "@/components/resource-view/detail-fields";
import { SealColorBadge } from "@/components/seals/seal-color-badge";
import { SealStatusBadge } from "@/components/seals/seal-status-badge";
import { getPrinterSealsSummary } from "@/lib/printer-seals";
import { formatDate } from "@/lib/datetime-form";
import { hrefForSeal } from "@/lib/table-foreign-hrefs";
import type { PrinterResponse } from "@/types/printer";
import type { SealResponse } from "@/types/seal";
import type { Role } from "@/types/user";

type PrinterSealsSectionProps = {
  printer: PrinterResponse;
  seals: SealResponse[];
  loading?: boolean;
  canManage?: boolean;
  userRole?: Role;
  onOpenManage?: () => void;
};

export function PrinterSealsSection({
  printer,
  seals,
  loading = false,
  canManage = false,
  userRole,
  onOpenManage,
}: PrinterSealsSectionProps) {
  if (userRole && userRole !== "ADMIN") {
    return null;
  }

  const { activeSeal, historicalSeals } = getPrinterSealsSummary(
    seals,
    printer.id,
  );

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold text-card-foreground">
            Precinto fiscal activo
          </h3>
          {canManage && onOpenManage ? (
            <button
              type="button"
              onClick={onOpenManage}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-foreground/5"
            >
              <ShieldCheck className="size-3.5 text-accent" aria-hidden />
              Gestionar precintos
            </button>
          ) : null}
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-muted">Cargando precintos…</p>
        ) : activeSeal ? (
          <dl className="mt-4 grid min-w-0 grid-cols-2 gap-4 sm:grid-cols-4">
            <DetailField
              label="Serial del precinto"
              value={activeSeal.serial}
              mono
              href={userRole ? hrefForSeal(activeSeal.id, userRole) : undefined}
            />
            <DetailField
              label="Color"
              value={<SealColorBadge color={activeSeal.color} />}
            />
            <DetailField
              label="Estatus"
              value={<SealStatusBadge status={activeSeal.status} />}
            />
            <DetailField
              label="Fecha de instalación"
              value={formatDate(activeSeal.installationDate)}
            />
          </dl>
        ) : (
          <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center">
            <ShieldAlert className="size-8 text-muted" aria-hidden />
            <p className="mt-2 text-sm font-medium text-card-foreground">
              Sin precinto fiscal activo
            </p>
            <p className="mt-1 max-w-md text-xs text-muted">
              Esta impresora no tiene un precinto con estatus «En impresora»
              asociado actualmente.
            </p>
            {canManage && onOpenManage ? (
              <button
                type="button"
                onClick={onOpenManage}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-opacity hover:opacity-90"
              >
                <Plus className="size-3.5" aria-hidden />
                Asociar precinto
              </button>
            ) : null}
          </div>
        )}
      </section>

      {historicalSeals.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-card-foreground">
            Historial de precintos anteriores
          </h3>
          <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-foreground/[0.02] text-xs font-medium text-muted">
                  <th className="px-4 py-2.5">Serial</th>
                  <th className="px-4 py-2.5">Color</th>
                  <th className="px-4 py-2.5">Estatus</th>
                  <th className="px-4 py-2.5">Fecha instalación</th>
                  <th className="px-4 py-2.5">Fecha retiro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {historicalSeals.map((seal) => {
                  const href = userRole
                    ? hrefForSeal(seal.id, userRole)
                    : undefined;
                  return (
                    <tr key={seal.id} className="hover:bg-foreground/[0.02]">
                      <td className="px-4 py-2.5 font-mono text-xs font-medium text-card-foreground">
                        {href ? (
                          <Link
                            href={href}
                            className="text-accent underline-offset-4 hover:underline"
                          >
                            {seal.serial}
                          </Link>
                        ) : (
                          seal.serial
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        <SealColorBadge color={seal.color} />
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        <SealStatusBadge status={seal.status} />
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted">
                        {formatDate(seal.installationDate)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted">
                        {formatDate(seal.removalDate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
