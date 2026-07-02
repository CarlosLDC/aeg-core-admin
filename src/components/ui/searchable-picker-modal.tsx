"use client";

import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { formFieldInputClass } from "@/lib/toggle-button-styles";

type SearchablePickerModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  searchPlaceholder: string;
  query: string;
  onQueryChange: (query: string) => void;
  children: ReactNode;
};

export function SearchablePickerModal({
  open,
  onClose,
  title,
  searchPlaceholder,
  query,
  onQueryChange,
  children,
}: SearchablePickerModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative flex max-h-[min(80vh,32rem)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
          <h3
            id={titleId}
            className="text-base font-semibold text-card-foreground"
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-foreground/5"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="shrink-0 border-b border-border p-3">
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={searchPlaceholder}
            className={formFieldInputClass}
            autoFocus
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
