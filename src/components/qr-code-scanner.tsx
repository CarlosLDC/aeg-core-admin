"use client";

import { useEffect, useId, useRef, useState } from "react";

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
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            onScan(decodedText);
          },
          () => {
            /* ignore per-frame scan misses */
          },
        );
        if (!cancelled) {
          setStarting(false);
        }
      } catch (err) {
        if (!cancelled) {
          setStarting(false);
          onError?.(
            err instanceof Error
              ? err.message
              : "No se pudo acceder a la cámara. Use la entrada manual.",
          );
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        void scanner.stop().then(() => scanner.clear()).catch(() => undefined);
      }
    };
  }, [containerId, onError, onScan]);

  return (
    <div className={className}>
      <div
        id={containerId}
        className="overflow-hidden rounded-xl border border-border bg-black"
      />
      {starting ? (
        <p className="mt-2 text-center text-xs text-muted">Iniciando cámara…</p>
      ) : null}
    </div>
  );
}
