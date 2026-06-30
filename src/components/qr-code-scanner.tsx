"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  disposeQrScanner,
  scheduleQrScannerCleanup,
  startQrScannerWithFallback,
  toErrorMessage,
  waitForDomElement,
  waitForQrScannerSlot,
} from "@/lib/qr-scanner-runtime";

type QrCodeScannerProps = {
  onScan: (decodedText: string) => void;
  onError?: (message: string) => void;
  className?: string;
};

export function canUseQrCamera(): boolean {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

export function QrCodeScanner({ onScan, onError, className }: QrCodeScannerProps) {
  const containerId = useId().replace(/:/g, "");
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        await waitForQrScannerSlot();
        if (cancelled) return;

        await waitForDomElement(containerId);
        if (cancelled) return;

        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        await startQrScannerWithFallback(scanner, Html5Qrcode, (decodedText) => {
          onScanRef.current(decodedText);
        });

        if (!cancelled) {
          setStarting(false);
        }
      } catch (err) {
        if (!cancelled) {
          setStarting(false);
          onErrorRef.current?.(
            toErrorMessage(
              err,
              "No se pudo acceder a la cámara. Use la entrada manual.",
            ),
          );
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;

      void scheduleQrScannerCleanup(async () => {
        await disposeQrScanner(scanner);
      });
    };
  }, [containerId]);

  return (
    <div className={className}>
      <div
        id={containerId}
        className="min-h-[280px] w-full overflow-hidden rounded-xl border border-border bg-black [&_video]:!object-cover"
      />
      {starting ? (
        <p className="mt-2 text-center text-xs text-muted">Iniciando cámara…</p>
      ) : null}
    </div>
  );
}
