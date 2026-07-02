"use client";

import { FormEvent, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2, X } from "lucide-react";
import { FormDialogFooterBar } from "@/components/ui/form-dialog-footer";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";

export const BATCH_FORM_INPUT_CLASS = `${formFieldInputClass} shadow-sm`;

export type BatchWizardStep = {
  label: string;
  icon: LucideIcon;
  subtitle: string;
};

type BatchFormDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  steps?: BatchWizardStep[];
  activeStep?: number;
  onStepChange?: (step: number) => void;
  error: string | null;
  progress: { done: number; total: number } | null;
  busy: boolean;
  submitDisabled?: boolean;
  formId?: string;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function BatchFormDialog({
  open,
  title,
  description,
  steps,
  activeStep = 1,
  onStepChange,
  error,
  progress,
  busy,
  submitDisabled = false,
  formId,
  onClose,
  onSubmit,
  children,
  footer,
}: BatchFormDialogProps) {
  if (!open) return null;

  const isWizard = steps != null && steps.length > 0;
  const stepIndex = Math.min(Math.max(activeStep, 1), steps?.length ?? 1) - 1;
  const stepSubtitle = isWizard ? steps[stepIndex]?.subtitle : description;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-form-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        onClick={onClose}
        disabled={busy}
      />
      <div
        className={cn(
          "relative flex max-h-[min(92vh,100dvh)] w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl",
          isWizard ? "max-w-2xl" : "max-w-xl",
        )}
      >
        <div className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="batch-form-title"
                className="text-lg font-semibold text-card-foreground"
              >
                {title}
              </h2>
              {stepSubtitle ? (
                <p className="mt-1 text-sm text-muted">{stepSubtitle}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-foreground/5 disabled:opacity-50"
            >
              <X className="size-5" />
            </button>
          </div>

          {isWizard && onStepChange ? (
            <nav className="mt-4 flex gap-1" aria-label="Pasos del lote">
              {steps.map((step, index) => {
                const stepNumber = index + 1;
                const Icon = step.icon;
                const isActive = activeStep === stepNumber;
                const isDone = activeStep > stepNumber;
                return (
                  <button
                    key={step.label}
                    type="button"
                    disabled={busy}
                    onClick={() => onStepChange(stepNumber)}
                    className={cn(
                      "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-center transition-colors",
                      "hover:bg-foreground/5 disabled:opacity-50",
                      isActive && "bg-accent/10 text-accent",
                      isDone && !isActive && "text-card-foreground",
                      !isActive && !isDone && "text-muted",
                    )}
                    aria-current={isActive ? "step" : undefined}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span className="text-[11px] font-medium leading-tight sm:text-xs">
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {error ? (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
            >
              {error}
            </p>
          ) : null}

          {progress && progress.total > 0 ? (
            <div
              className="mb-4 rounded-lg border border-border bg-background/70 p-3"
              role="status"
            >
              <p className="mb-2 flex items-center gap-2 text-sm text-muted">
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                Creando {Math.min(progress.done + 1, progress.total)} de{" "}
                {progress.total} registros...
              </p>
              <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-300"
                  style={{
                    width: `${Math.round(
                      (Math.min(progress.done + 1, progress.total) /
                        progress.total) *
                        100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          ) : null}

          <form
            id={formId}
            onSubmit={onSubmit}
            className={cn(isWizard && "flex h-full flex-col")}
          >
            {children}
          </form>
        </div>

        <div className="shrink-0 border-t border-border px-4 py-4 sm:px-6">
          <FormDialogFooterBar>
            {footer ?? (
              <BatchFormDialogFooter
                busy={busy}
                submitDisabled={submitDisabled}
                onClose={onClose}
                formId={formId}
                embedded
              />
            )}
          </FormDialogFooterBar>
        </div>
      </div>
    </div>
  );
}

type BatchFormDialogFooterProps = {
  busy: boolean;
  submitDisabled?: boolean;
  onClose: () => void;
  formId?: string;
  /** Sin borde ni padding; el contenedor del modal ya los aplica. */
  embedded?: boolean;
};

export function BatchFormDialogFooter({
  busy,
  submitDisabled = false,
  onClose,
  formId,
  embedded = false,
}: BatchFormDialogFooterProps) {
  const blocked = busy || submitDisabled;

  const buttons = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&_button]:w-full sm:[&_button]:w-auto">
      <button
        type="button"
        onClick={onClose}
        disabled={busy}
        className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5 disabled:opacity-50"
      >
        Cancelar
      </button>
      <button
        type="submit"
        form={formId}
        disabled={blocked}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground",
          blocked && "cursor-not-allowed opacity-70",
        )}
      >
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Crear lote
      </button>
    </div>
  );

  if (embedded) return buttons;

  return (
    <div className="flex shrink-0 flex-col gap-3 border-t border-border px-4 py-4 sm:px-6">
      <FormDialogFooterBar>{buttons}</FormDialogFooterBar>
    </div>
  );
}
