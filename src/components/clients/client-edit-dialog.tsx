"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { ContributorTypeToggle } from "@/components/companies/contributor-type-toggle";
import type { BranchResponse } from "@/types/branch";
import { type CompanyResponse, type ContributorType } from "@/types/company";
import { FieldLabel } from "@/components/ui/field-label";
import { cn } from "@/lib/utils";

export type ClientEditValues = {
  businessName: string;
  rif: string;
  contributorType: ContributorType;
  city: string;
  state: string;
  address: string;
  contactPersonName: string;
  phone: string;
  email: string;
};

type ClientEditDialogProps = {
  open: boolean;
  saving: boolean;
  error: string | null;
  company: CompanyResponse;
  branch: BranchResponse;
  onClose: () => void;
  onSubmit: (values: ClientEditValues) => void;
};

const emptyForm: ClientEditValues = {
  businessName: "",
  rif: "",
  contributorType: "ordinario",
  city: "",
  state: "",
  address: "",
  contactPersonName: "",
  phone: "",
  email: "",
};

export function ClientEditDialog({
  open,
  saving,
  error,
  company,
  branch,
  onClose,
  onSubmit,
}: ClientEditDialogProps) {
  const [form, setForm] = useState<ClientEditValues>(emptyForm);

  useEffect(() => {
    if (!open) return;
    setForm({
      businessName: company.businessName ?? "",
      rif: company.rif ?? "",
      contributorType: company.contributorType,
      city: branch.city ?? "",
      state: branch.state ?? "",
      address: branch.address ?? "",
      contactPersonName: branch.contactPersonName ?? "",
      phone: branch.phone ?? "",
      email: branch.email ?? "",
    });
  }, [open, company, branch]);

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      ...form,
      businessName: form.businessName.trim(),
      rif: form.rif.trim().toUpperCase(),
      city: form.city.trim(),
      state: form.state.trim(),
      address: form.address.trim(),
      contactPersonName: form.contactPersonName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
    });
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20";

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
      <div className="relative max-h-[min(92vh,100dvh)] w-full max-w-xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">
              Editar cliente
            </h2>
            <p className="mt-1 text-sm text-muted">
              Ajusta los datos de empresa y ubicación de la sucursal cliente.
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
            <FieldLabel required>Razón social</FieldLabel>
            <input
              type="text"
              required
              value={form.businessName}
              onChange={(e) =>
                setForm((f) => ({ ...f, businessName: e.target.value }))
              }
              className={inputClass}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <FieldLabel required>RIF</FieldLabel>
              <input
                type="text"
                required
                value={form.rif}
                onChange={(e) =>
                  setForm((f) => ({ ...f, rif: e.target.value.toUpperCase() }))
                }
                className={cn(inputClass, "font-mono uppercase")}
              />
            </label>
            <ContributorTypeToggle
              value={form.contributorType}
              onChange={(contributorType) =>
                setForm((f) => ({ ...f, contributorType }))
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <FieldLabel required>Estado</FieldLabel>
              <input
                type="text"
                required
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="block">
              <FieldLabel required>Ciudad</FieldLabel>
              <input
                type="text"
                required
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                className={inputClass}
              />
            </label>
          </div>
          <label className="block">
            <FieldLabel>Dirección</FieldLabel>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className={inputClass}
            />
          </label>
          <label className="block">
            <FieldLabel required>Persona de contacto</FieldLabel>
            <input
              type="text"
              required
              value={form.contactPersonName}
              onChange={(e) =>
                setForm((f) => ({ ...f, contactPersonName: e.target.value }))
              }
              className={inputClass}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <FieldLabel>Teléfono</FieldLabel>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="block">
              <FieldLabel>Correo</FieldLabel>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={inputClass}
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
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
                "inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground",
                saving && "cursor-not-allowed opacity-70",
              )}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
