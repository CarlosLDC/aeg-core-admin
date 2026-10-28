"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { CompanySelect } from "@/components/companies/company-select";
import { FieldLabel } from "@/components/ui/field-label";
import { FormDialogFooter } from "@/components/ui/form-dialog-footer";
import {
  COMMON_OPERATING_SYSTEMS,
  COMMON_PROGRAMMING_LANGUAGES,
  INITIAL_SOFTWARE_FORM_VALUES,
  softwareToFormValues,
  type SoftwareFormValues,
} from "@/lib/software-form";
import {
  formFieldInputClass,
  formFieldSegmentedToggleShellClass,
  segmentedToggleActiveClass,
  toggleButtonClass,
} from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";
import type { CompanyResponse } from "@/types/company";
import type { SoftwareResponse } from "@/types/software";

type SoftwareFormDialogProps = {
  mode: "create" | "edit";
  software?: SoftwareResponse;
  open: boolean;
  saving: boolean;
  error: string | null;
  companies: CompanyResponse[];
  onClose: () => void;
  onSubmit: (values: SoftwareFormValues) => void;
};

export function SoftwareFormDialog({
  mode,
  software,
  open,
  saving,
  error,
  companies,
  onClose,
  onSubmit,
}: SoftwareFormDialogProps) {
  const [form, setForm] = useState<SoftwareFormValues>(
    INITIAL_SOFTWARE_FORM_VALUES,
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [customLanguage, setCustomLanguage] = useState("");
  const [selectedDistributorToAdd, setSelectedDistributorToAdd] = useState("");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && software) {
      setForm(softwareToFormValues(software));
    } else {
      setForm(INITIAL_SOFTWARE_FORM_VALUES);
    }
    setLocalError(null);
    setCustomLanguage("");
    setSelectedDistributorToAdd("");
  }, [open, mode, software]);

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!form.name.trim()) {
      setLocalError("El nombre del software es obligatorio.");
      return;
    }
    if (!form.version.trim()) {
      setLocalError("La versión del software es obligatoria.");
      return;
    }
    onSubmit(form);
  }

  function toggleLanguage(lang: string) {
    setForm((prev) => {
      const exists = prev.programmingLanguages.includes(lang);
      return {
        ...prev,
        programmingLanguages: exists
          ? prev.programmingLanguages.filter((l) => l !== lang)
          : [...prev.programmingLanguages, lang],
      };
    });
  }

  function addCustomLanguage() {
    const val = customLanguage.trim();
    if (!val) return;
    if (!form.programmingLanguages.includes(val)) {
      setForm((prev) => ({
        ...prev,
        programmingLanguages: [...prev.programmingLanguages, val],
      }));
    }
    setCustomLanguage("");
  }

  function toggleOs(os: string) {
    setForm((prev) => {
      const exists = prev.operatingSystems.includes(os);
      return {
        ...prev,
        operatingSystems: exists
          ? prev.operatingSystems.filter((o) => o !== os)
          : [...prev.operatingSystems, os],
      };
    });
  }

  function addDistributorCompany(companyIdStr: string) {
    const id = Number(companyIdStr);
    if (!id || Number.isNaN(id)) return;
    if (!form.distributorCompanyIds.includes(id)) {
      setForm((prev) => ({
        ...prev,
        distributorCompanyIds: [...prev.distributorCompanyIds, id],
      }));
    }
    setSelectedDistributorToAdd("");
  }

  function removeDistributorCompany(id: number) {
    setForm((prev) => ({
      ...prev,
      distributorCompanyIds: prev.distributorCompanyIds.filter(
        (cid) => cid !== id,
      ),
    }));
  }

  const selectedDistributors = form.distributorCompanyIds
    .map((id) => companies.find((c) => c.id === id))
    .filter((c): c is CompanyResponse => c != null);

  const availableDistributorCompanies = companies.filter(
    (c) => !form.distributorCompanyIds.includes(c.id),
  );

  const allLanguageOptions = Array.from(
    new Set([...COMMON_PROGRAMMING_LANGUAGES, ...form.programmingLanguages]),
  );

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
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">
              {mode === "create" ? "Nuevo software" : "Editar software"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Catálogo de programas de computación y facturación (Art. 46 h).
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

        {(localError ?? error) && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
          >
            {localError ?? error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset className="space-y-4 rounded-xl border border-border p-4">
            <legend className="px-1 text-sm font-semibold text-card-foreground">
              Datos generales
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <FieldLabel required>Nombre del software</FieldLabel>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Ej. Saint Enterprise, A2, Valery…"
                  className={formFieldInputClass}
                />
              </label>
              <label className="block">
                <FieldLabel required>Versión</FieldLabel>
                <input
                  type="text"
                  required
                  value={form.version}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, version: e.target.value }))
                  }
                  placeholder="Ej. 1.0, 2.5.4…"
                  className={cn(formFieldInputClass, "font-mono")}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Tipo de desarrollo</FieldLabel>
                <div
                  role="group"
                  aria-label="Tipo de desarrollo"
                  className={formFieldSegmentedToggleShellClass}
                >
                  <button
                    type="button"
                    aria-pressed={!form.external}
                    onClick={() => setForm((f) => ({ ...f, external: false }))}
                    className={cn(
                      "flex-1 rounded-md px-3 text-sm font-medium transition-colors",
                      !form.external
                        ? segmentedToggleActiveClass("emerald")
                        : "text-muted hover:text-card-foreground",
                    )}
                  >
                    Propio
                  </button>
                  <button
                    type="button"
                    aria-pressed={form.external}
                    onClick={() => setForm((f) => ({ ...f, external: true }))}
                    className={cn(
                      "flex-1 rounded-md px-3 text-sm font-medium transition-colors",
                      form.external
                        ? segmentedToggleActiveClass("amber")
                        : "text-muted hover:text-card-foreground",
                    )}
                  >
                    Terceros
                  </button>
                </div>
              </div>
              <div>
                <FieldLabel>Empresa desarrolladora</FieldLabel>
                <CompanySelect
                  value={form.developerCompanyId}
                  onChange={(developerCompanyId) =>
                    setForm((f) => ({ ...f, developerCompanyId }))
                  }
                  companies={companies}
                  disabled={saving}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-4 rounded-xl border border-border p-4">
            <legend className="px-1 text-sm font-semibold text-card-foreground">
              Especificaciones técnicas
            </legend>
            <div>
              <FieldLabel>Lenguajes de programación</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {allLanguageOptions.map((lang) => {
                  const active = form.programmingLanguages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleLanguage(lang)}
                      className={toggleButtonClass(active, "sky")}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={customLanguage}
                  onChange={(e) => setCustomLanguage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomLanguage();
                    }
                  }}
                  placeholder="Agregar otro lenguaje…"
                  className={cn(formFieldInputClass, "flex-1")}
                />
                <button
                  type="button"
                  onClick={addCustomLanguage}
                  disabled={!customLanguage.trim()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50"
                >
                  <Plus className="size-4" />
                  Agregar
                </button>
              </div>
            </div>

            <div>
              <FieldLabel>Sistemas operativos</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {COMMON_OPERATING_SYSTEMS.map((os) => {
                  const active = form.operatingSystems.includes(os);
                  return (
                    <button
                      key={os}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleOs(os)}
                      className={toggleButtonClass(active, "sky")}
                    >
                      {os}
                    </button>
                  );
                })}
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-4 rounded-xl border border-border p-4">
            <legend className="px-1 text-sm font-semibold text-card-foreground">
              Distribuidores autorizados
            </legend>
            <div>
              <FieldLabel>Vincular empresa distribuidora</FieldLabel>
              <CompanySelect
                value={selectedDistributorToAdd}
                onChange={addDistributorCompany}
                companies={availableDistributorCompanies}
                disabled={saving}
              />
            </div>

            {selectedDistributors.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedDistributors.map((d) => (
                  <span
                    key={d.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-card-foreground"
                  >
                    <span>{d.businessName || d.rif}</span>
                    <span className="font-mono text-muted">({d.rif})</span>
                    <button
                      type="button"
                      onClick={() => removeDistributorCompany(d.id)}
                      className="rounded p-0.5 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-600"
                      aria-label={`Quitar distribuidor ${d.businessName || d.rif}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted">
                Sin distribuidores seleccionados.
              </p>
            )}
          </fieldset>

          <FormDialogFooter mode={mode} saving={saving} onClose={onClose} />
        </form>
      </div>
    </div>
  );
}
