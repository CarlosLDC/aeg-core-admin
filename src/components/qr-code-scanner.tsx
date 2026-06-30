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

async function resolveCameraConfig(
  Html5Qrcode: typeof import("html5-qrcode").Html5Qrcode,
): Promise<string | { facingMode: string }> {
  try {
    const cameras = await Html5Qrcode.getCameras();
    if (cameras.length > 0) {
      const back = cameras.find((camera) =>
        /back|rear|environment|trasera/i.test(camera.label),
      );
      return back?.id ?? cameras[cameras.length - 1].id;
    }
  } catch {
    /* use facingMode fallback */
  }
  return { facingMode: "environment" };
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
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        const cameraConfig = await resolveCameraConfig(Html5Qrcode);
        if (cancelled) return;

        await scanner.start(
          cameraConfig,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            onScanRef.current(decodedText);
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
          const message =
            err instanceof Error
              ? err.message
              : "No se pudo acceder a la cámara. Use la entrada manual.";
          onErrorRef.current?.(message);
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (!scanner) return;

      void (async () => {
        try {
          if (scanner.isScanning) {
            await scanner.stop();
          }
        } catch {
          /* scanner may already be stopped */
        }
        try {
          scanner.clear();
        } catch {
          /* container may already be cleared */
        }
      })();
    };
  }, [containerId]);

  return (
    <div className={className}>
      <div
        id={containerId}
        className="min-h-[280px] overflow-hidden rounded-xl border border-border bg-black"
      />
      {starting ? (
        <p className="mt-2 text-center text-xs text-muted">Iniciando cámara…</p>
      ) : null}
    </div>
  );
}
