"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { ContributorTypeToggle } from "@/components/companies/contributor-type-toggle";
import { FieldLabel } from "@/components/ui/field-label";
import { FormDialogFooter } from "@/components/ui/form-dialog-footer";
import { zodFieldErrors } from "@/lib/form-zod";
import { companyFormSchema } from "@/lib/schemas/company-form-schema";
import { type CompanyResponse, type ContributorType } from "@/types/company";
import { cn } from "@/lib/utils";

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
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof CompanyFormValues, string>>
  >({});

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
    setFieldErrors({});
  }, [open, mode, company]);

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = companyFormSchema.safeParse({
      ...form,
      businessName: form.businessName.trim(),
      rif: form.rif.trim(),
    });
    const errors = zodFieldErrors(parsed);
    if (errors) {
      setFieldErrors(errors);
      return;
    }
    if (!parsed.success) return;
    setFieldErrors({});
    onSubmit(parsed.data);
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

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
          >
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <FieldLabel required>RIF</FieldLabel>
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
            {fieldErrors.rif ? (
              <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">
                {fieldErrors.rif}
              </span>
            ) : null}
          </label>

          <label className="block">
            <FieldLabel required>Razón social</FieldLabel>
            <input
              type="text"
              required
              value={form.businessName}
              onChange={(e) =>
                setForm((f) => ({ ...f, businessName: e.target.value }))
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20"
            />
            {fieldErrors.businessName ? (
              <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">
                {fieldErrors.businessName}
              </span>
            ) : null}
          </label>

          <ContributorTypeToggle
            required
            value={form.contributorType}
            onChange={(contributorType) =>
              setForm((f) => ({ ...f, contributorType }))
            }
          />
          {fieldErrors.contributorType ? (
            <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">
              {fieldErrors.contributorType}
            </span>
          ) : null}

          <FormDialogFooter
            mode={mode}
            saving={saving}
            onClose={onClose}
          />
        </form>
      </div>
    </div>
  );
}
