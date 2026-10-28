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
import { formFieldInputClass } from "@/lib/toggle-button-styles";
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
  const [form, setForm] = useState<SoftwareFormValues>(INITIAL_SOFTWARE_FORM_VALUES);
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
      distributorCompanyIds: prev.distributorCompanyIds.filter((cid) => cid !== id),
    }));
  }

  const selectedDistributors = form.distributorCompanyIds
    .map((id) => companies.find((c) => c.id === id))
    .filter((c): c is CompanyResponse => c != null);

  const availableDistributorCompanies = companies.filter(
    (c) => !form.distributorCompanyIds.includes(c.id),
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
              Catálogo de programas de computación y facturación (Art. 46 h SENIAT).
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

        {(localError || error) && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
            {localError || error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <FieldLabel required>Nombre del software</FieldLabel>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                placeholder="Ej. 1.0, 2.5.4…"
                className={formFieldInputClass}
              />
            </label>
          </div>

          <div className="rounded-lg border border-border bg-background/50 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <input
                id="software-external"
                type="checkbox"
                checked={form.external}
                onChange={(e) => setForm({ ...form, external: e.target.checked })}
                className="size-4 rounded border-border text-primary focus:ring-primary"
              />
              <label
                htmlFor="software-external"
                className="text-sm font-medium text-card-foreground cursor-pointer select-none"
              >
                Software ajeno / de terceros (desarrollador externo)
              </label>
            </div>

            <div>
              <FieldLabel>
                Empresa fabricante / desarrolladora (Art. 46 h)
              </FieldLabel>
              <CompanySelect
                value={form.developerCompanyId}
                onChange={(developerCompanyId) =>
                  setForm({ ...form, developerCompanyId })
                }
                companies={companies}
              />
              <p className="mt-1 text-xs text-muted">
                Empresa o persona jurídica con RIF registrada como desarrolladora del software.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background/50 p-4 space-y-3">
            <div>
              <span className="text-sm font-medium text-card-foreground">
                Distribuidores autorizados del software (Art. 46 h)
              </span>
              <p className="text-xs text-muted">
                Empresas autorizadas para comercializar y distribuir este software.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex-1">
                <CompanySelect
                  value={selectedDistributorToAdd}
                  onChange={addDistributorCompany}
                  companies={availableDistributorCompanies}
                />
              </div>
            </div>

            {selectedDistributors.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedDistributors.map((d) => (
                  <span
                    key={d.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-card-foreground shadow-sm"
                  >
                    <span>{d.businessName || d.rif}</span>
                    <span className="text-muted text-[10px]">({d.rif})</span>
                    <button
                      type="button"
                      onClick={() => removeDistributorCompany(d.id)}
                      className="ml-1 rounded-full p-0.5 text-muted hover:bg-foreground/10 hover:text-card-foreground"
                      aria-label={`Quitar distribuidor ${d.businessName}`}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs italic text-muted">
                No hay distribuidores vinculados aún a este software.
              </p>
            )}
          </div>

          <div>
            <FieldLabel>Lenguajes de programación</FieldLabel>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_PROGRAMMING_LANGUAGES.map((lang) => {
                const active = form.programmingLanguages.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLanguage(lang)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-muted hover:bg-foreground/5 hover:text-card-foreground"
                    }`}
                  >
                    {lang}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
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
                placeholder="Otro lenguaje…"
                className={`${formFieldInputClass} flex-1`}
              />
              <button
                type="button"
                onClick={addCustomLanguage}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-card-foreground hover:bg-foreground/5"
              >
                <Plus className="size-3.5" />
                Agregar
              </button>
            </div>
            {form.programmingLanguages.some(
              (l) => !COMMON_PROGRAMMING_LANGUAGES.includes(l),
            ) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.programmingLanguages
                  .filter((l) => !COMMON_PROGRAMMING_LANGUAGES.includes(l))
                  .map((custom) => (
                    <span
                      key={custom}
                      className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary"
                    >
                      {custom}
                      <button
                        type="button"
                        onClick={() => toggleLanguage(custom)}
                        className="hover:opacity-75"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
              </div>
            )}
          </div>

          <div>
            <FieldLabel>Sistemas operativos soportados</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_OPERATING_SYSTEMS.map((os) => {
                const active = form.operatingSystems.includes(os);
                return (
                  <button
                    key={os}
                    type="button"
                    onClick={() => toggleOs(os)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-muted hover:bg-foreground/5 hover:text-card-foreground"
                    }`}
                  >
                    {os}
                  </button>
                );
              })}
            </div>
          </div>

          <FormDialogFooter
            mode={mode}
            saving={saving}
            onClose={onClose}
            createLabel="Crear software"
            saveLabel="Guardar cambios"
          />
        </form>
      </div>
    </div>
  );
}
