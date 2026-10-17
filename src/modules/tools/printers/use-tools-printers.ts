"use client";

import {
  type ToolsSectionContextValue,
  useToolsSectionContext,
} from "./tools-printers-context";

export function useToolsPrinters(): ToolsSectionContextValue {
  const context = useToolsSectionContext();
  if (!context) {
    throw new Error(
      "useToolsPrinters debe usarse dentro de ToolsSectionProvider",
    );
  }
  return context;
}
