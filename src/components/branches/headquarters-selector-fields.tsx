"use client";

import { Building2, Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type HeadquartersSelectorFieldsProps = {
  isHeadquarters: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
};

export function HeadquartersSelectorFields({
  isHeadquarters,
  disabled = false,
  onChange,
}: HeadquartersSelectorFieldsProps) {
  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Casa matriz</legend>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-card-foreground">
          Esta sucursal sera casa matriz?
        </p>
        <p className="text-xs text-muted">
          Elige el rol principal de esta sede dentro de la estructura del
          cliente.
        </p>
      </div>
      <div className="relative">
        <div className="pointer-events-none absolute -inset-1 hidden sm:block">
          <div
            className={cn(
              "absolute bottom-1 top-1 w-[calc(50%-0.375rem)] rounded-2xl border transition-all duration-300",
              isHeadquarters
                ? "translate-x-0 border-amber-400/45 bg-amber-400/5 shadow-[0_0_24px_rgba(251,191,36,0.16)]"
                : "translate-x-[calc(100%+0.75rem)] border-sky-400/45 bg-sky-400/5 shadow-[0_0_24px_rgba(56,189,248,0.16)]",
            )}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(true)}
          className={cn(
            "group relative z-10 overflow-hidden rounded-xl border px-4 py-3 text-left transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
            isHeadquarters
              ? "border-amber-400/50 bg-gradient-to-br from-amber-500/20 to-orange-500/10 shadow-[0_0_0_1px_rgba(251,191,36,0.35)]"
              : "border-border bg-background/70 hover:-translate-y-0.5 hover:border-amber-400/30 hover:shadow-md",
            disabled && "cursor-not-allowed opacity-60",
          )}
          aria-pressed={isHeadquarters}
        >
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="absolute -top-8 -right-8 size-20 rounded-full bg-amber-400/15 blur-xl" />
          </div>
          <div
            className={cn(
              "pointer-events-none absolute inset-x-4 bottom-2 h-1 rounded-full transition-all duration-300 sm:hidden",
              isHeadquarters
                ? "bg-amber-300/90 shadow-[0_0_10px_rgba(252,211,77,0.75)]"
                : "bg-transparent",
            )}
          />
          <div className="mb-1 flex items-center gap-2">
            <Crown
              className={cn(
                "size-4 text-amber-400 transition-transform",
                isHeadquarters && "scale-110",
              )}
            />
            <span className="text-sm font-semibold">Si, es matriz</span>
            <div className="ml-auto flex items-center gap-2">
              <span
                className={cn(
                  "size-2 rounded-full transition-all",
                  isHeadquarters
                    ? "bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.75)]"
                    : "bg-transparent",
                )}
              />
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                <Sparkles className="size-3" />
                Recomendado
              </span>
            </div>
          </div>
          <p className="text-xs text-muted/90">
            Esta sera la sede principal de la empresa.
          </p>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(false)}
          className={cn(
            "group relative z-10 overflow-hidden rounded-xl border px-4 py-3 text-left transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
            !isHeadquarters
              ? "border-sky-400/50 bg-gradient-to-br from-sky-500/20 to-blue-500/10 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]"
              : "border-border bg-background/70 hover:-translate-y-0.5 hover:border-sky-400/30 hover:shadow-md",
            disabled && "cursor-not-allowed opacity-60",
          )}
          aria-pressed={!isHeadquarters}
        >
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="absolute -top-8 -right-8 size-20 rounded-full bg-sky-400/15 blur-xl" />
          </div>
          <div
            className={cn(
              "pointer-events-none absolute inset-x-4 bottom-2 h-1 rounded-full transition-all duration-300 sm:hidden",
              !isHeadquarters
                ? "bg-sky-300/90 shadow-[0_0_10px_rgba(125,211,252,0.75)]"
                : "bg-transparent",
            )}
          />
          <div className="mb-1 flex items-center gap-2">
            <Building2
              className={cn(
                "size-4 text-sky-400 transition-transform",
                !isHeadquarters && "scale-110",
              )}
            />
            <span className="text-sm font-semibold">No, es sucursal</span>
            <span
              className={cn(
                "ml-auto size-2 rounded-full transition-all",
                !isHeadquarters ? "bg-sky-300 shadow-[0_0_10px_rgba(125,211,252,0.75)]" : "bg-transparent",
              )}
            />
          </div>
          <p className="text-xs text-muted/90">
            Se registrara como sede operativa secundaria.
          </p>
        </button>
      </div>
      </div>
    </fieldset>
  );
}
