"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ConfirmDialog,
  type ConfirmDialogOptions,
} from "@/components/ui/confirm-dialog";

type ConfirmFn = (options: ConfirmDialogOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmDialogOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setOptions(opts);
    });
  }, []);

  function finish(result: boolean) {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setOptions(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options ? (
        <ConfirmDialog
          open
          {...options}
          onConfirm={() => finish(true)}
          onCancel={() => finish(false)}
        />
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm debe usarse dentro de ConfirmProvider");
  }
  return ctx;
}
