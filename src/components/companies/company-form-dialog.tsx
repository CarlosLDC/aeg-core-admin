"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { CONTRIBUTOR_LABELS } from "@/lib/contributor-types";
import {
  CONTRIBUTOR_TYPES,
  type CompanyResponse,
  type ContributorType,
} from "@/types/company";
import { cn } from "@/lib/utils";

const RIF_PATTERN = /^[VEJPG][0-9]{7,9}$/;

export type CompanyFormValues = {
  businessName: string;
  rif: string;
  contributorType: ContributorType;
};

type CompanyFormDialogProps = {
  mode: "create" | "edit";
  company?: CompanyResponse;
  open: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: CompanyFormValues) => void;
};

const emptyForm: CompanyFormValues = {
  businessName: "",
  rif: "",
  contributorType: "ordinario",
};

export function CompanyFormDialog({
  mode,
  company,
  open,
  saving,
  error,
  onClose,
  onSubmit,
}: CompanyFormDialogProps) {
  const [form, setForm] = useState<CompanyFormValues>(emptyForm);
  const [rifError, setRifError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && company) {
      setForm({
        businessName: company.businessName ?? "",
        rif: company.rif,
        contributorType: company.contributorType,
      });
    } else {
      setForm(emptyForm);
    }
    setRifError(null);
  }, [open, mode, company]);

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const rif = form.rif.trim().toUpperCase();
    if (!RIF_PATTERN.test(rif)) {
      setRifError("Formato: letra V, E, J, P o G seguida de 7 a 9 dígitos.");
      return;
    }
    setRifError(null);
    onSubmit({ ...form, businessName: form.businessName.trim(), rif });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative max-h-[min(90vh,100dvh)] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-xl sm:p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">
              {mode === "create" ? "Nueva empresa" : "Editar empresa"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Tipo de contribuyente: ordinario, especial o formal.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-foreground/5"
          >
            <X className="size-5" />
          </button>
        </div>

        {(error || rifError) && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
          >
            {rifError ?? error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              Razón social
            </span>
            <input
              type="text"
              required
              value={form.businessName}
              onChange={(e) =>
                setForm((f) => ({ ...f, businessName: e.target.value }))
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">RIF</span>
            <input
              type="text"
              required
              value={form.rif}
              onChange={(e) =>
                setForm((f) => ({ ...f, rif: e.target.value.toUpperCase() }))
              }
              placeholder="J123456789"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm uppercase outline-none focus:border-accent focus:ring-2 focus:ring-ring/20"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              Tipo de contribuyente
            </span>
            <select
              value={form.contributorType}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  contributorType: e.target.value as ContributorType,
                }))
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20"
            >
              {CONTRIBUTOR_TYPES.map((type) => (
                <option key={type} value={type}>
                  {CONTRIBUTOR_LABELS[type]} ({type})
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end [&_button]:w-full sm:[&_button]:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className={cn(
                "flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground",
                saving && "cursor-not-allowed opacity-70",
              )}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {mode === "create" ? "Crear" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
