type Html5QrcodeInstance = import("html5-qrcode").Html5Qrcode;

let scannerCleanupChain: Promise<void> = Promise.resolve();

function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  if (typeof err === "string" && err.trim()) return err;
  return fallback;
}

export function waitForDomElement(elementId: string, attempts = 12): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    let tries = 0;

    const tick = () => {
      const element = document.getElementById(elementId);
      if (element) {
        resolve(element);
        return;
      }

      tries += 1;
      if (tries >= attempts) {
        reject(new Error("No se pudo inicializar el visor de cámara."));
        return;
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  });
}

export async function disposeQrScanner(scanner: Html5QrcodeInstance | null): Promise<void> {
  if (!scanner) return;

  try {
    const { Html5QrcodeScannerState } = await import("html5-qrcode");
    const state = scanner.getState();
    if (
      state === Html5QrcodeScannerState.SCANNING ||
      state === Html5QrcodeScannerState.PAUSED
    ) {
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
}

export function waitForQrScannerSlot(): Promise<void> {
  return scannerCleanupChain;
}

export function scheduleQrScannerCleanup(
  cleanup: () => Promise<void>,
): Promise<void> {
  const next = scannerCleanupChain.then(cleanup, cleanup);
  scannerCleanupChain = next.catch(() => undefined);
  return next;
}

export async function buildCameraAttempts(
  Html5Qrcode: typeof import("html5-qrcode").Html5Qrcode,
): Promise<Array<string | { facingMode: string }>> {
  const attempts: Array<string | { facingMode: string }> = [
    { facingMode: "environment" },
    { facingMode: "user" },
  ];

  try {
    const cameras = await Html5Qrcode.getCameras();
    for (const camera of cameras) {
      attempts.push(camera.id);
    }
  } catch {
    /* permission or enumeration may fail before the first stream */
  }

  return attempts;
}

export async function startQrScannerWithFallback(
  scanner: Html5QrcodeInstance,
  Html5Qrcode: typeof import("html5-qrcode").Html5Qrcode,
  onDecoded: (text: string) => void,
): Promise<void> {
  const attempts = await buildCameraAttempts(Html5Qrcode);
  const scanConfig = {
    fps: 10,
    qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
      const edge = Math.min(viewfinderWidth, viewfinderHeight);
      const size = Math.max(180, Math.min(250, Math.floor(edge * 0.72)));
      return { width: size, height: size };
    },
  };

  let lastError: unknown = null;

  for (const cameraConfig of attempts) {
    try {
      let handled = false;

      await scanner.start(
        cameraConfig,
        scanConfig,
        (decodedText) => {
          if (handled) return;
          handled = true;

          void disposeQrScanner(scanner).catch(() => undefined);

          try {
            onDecoded(decodedText);
          } catch (err) {
            console.error("QR scan handler failed:", err);
          }
        },
        () => {
          /* ignore per-frame scan misses */
        },
      );

      return;
    } catch (err) {
      lastError = err;
      try {
        scanner.clear();
      } catch {
        /* try next camera */
      }
    }
  }

  throw lastError ?? new Error("No se pudo acceder a la cámara. Use la entrada manual.");
}

export { toErrorMessage };
