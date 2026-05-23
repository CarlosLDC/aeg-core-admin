"use client";

import { Building2, Crown } from "lucide-react";
import {
  toggleCardAccentClass,
  toggleCardActiveClass,
  toggleCardBarClass,
  toggleCardDotClass,
  TOGGLE_CARD_INACTIVE,
} from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";

type HeadquartersSelectorFieldsProps = {
  isHeadquarters: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
};

const HQ_YES_TONE = "emerald" as const;
const HQ_NO_TONE = "slate" as const;

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
          ¿Esta sucursal será casa matriz?
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
              "absolute bottom-1 top-1 w-[calc(50%-0.375rem)] rounded-xl border transition-all duration-200",
              isHeadquarters
                ? cn("translate-x-0", toggleCardActiveClass(HQ_YES_TONE))
                : cn(
                    "translate-x-[calc(100%+0.75rem)]",
                    toggleCardActiveClass(HQ_NO_TONE),
                  ),
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
              ? toggleCardActiveClass(HQ_YES_TONE)
              : TOGGLE_CARD_INACTIVE,
            disabled && "cursor-not-allowed opacity-60",
          )}
          aria-pressed={isHeadquarters}
        >
          <div
            className={cn(
              "pointer-events-none absolute inset-x-4 bottom-2 h-0.5 rounded-full transition-all duration-200 sm:hidden",
              isHeadquarters
                ? toggleCardBarClass(HQ_YES_TONE)
                : "bg-transparent",
            )}
          />
          <div className="mb-1 flex items-center gap-2">
            <Crown
              className={cn(
                "size-4 text-muted transition-colors",
                isHeadquarters && toggleCardAccentClass(HQ_YES_TONE),
              )}
            />
            <span className="text-sm font-semibold">Sí, es matriz</span>
            <span
              className={cn(
                "ml-auto size-2 rounded-full transition-colors",
                isHeadquarters ? toggleCardDotClass(HQ_YES_TONE) : "bg-transparent",
              )}
            />
          </div>
          <p className="text-xs text-muted/90">
            Esta será la sede principal de la empresa.
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
              ? toggleCardActiveClass(HQ_NO_TONE)
              : TOGGLE_CARD_INACTIVE,
            disabled && "cursor-not-allowed opacity-60",
          )}
          aria-pressed={!isHeadquarters}
        >
          <div
            className={cn(
              "pointer-events-none absolute inset-x-4 bottom-2 h-0.5 rounded-full transition-all duration-200 sm:hidden",
              !isHeadquarters
                ? toggleCardBarClass(HQ_NO_TONE)
                : "bg-transparent",
            )}
          />
          <div className="mb-1 flex items-center gap-2">
            <Building2
              className={cn(
                "size-4 text-muted transition-colors",
                !isHeadquarters && toggleCardAccentClass(HQ_NO_TONE),
              )}
            />
            <span className="text-sm font-semibold">No, es sucursal</span>
            <span
              className={cn(
                "ml-auto size-2 rounded-full transition-colors",
                !isHeadquarters ? toggleCardDotClass(HQ_NO_TONE) : "bg-transparent",
              )}
            />
          </div>
          <p className="text-xs text-muted/90">
            Se registrará como sede operativa secundaria.
          </p>
        </button>
      </div>
      </div>
    </fieldset>
  );
}
