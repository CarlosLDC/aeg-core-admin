"use client";

import { useCallback, useRef, useState } from "react";
import { QrCode } from "lucide-react";
import { getSession } from "@/lib/auth";
import { isRemembered } from "@/lib/auth-storage";
import { completeFiscalBooksHandoffFromAdmin } from "@/lib/fiscal-books-handoff";
import {
  getQrLookupErrorMessage,
  lookupInspectionByQr,
  QR_INVALID_CODE_MESSAGE,
} from "@/lib/annual-inspection-qr-lookup-api";
import { canUseQrCamera, QrCodeScanner } from "@/components/qr-code-scanner";
import { QrScannerErrorBoundary } from "@/components/qr-scanner-error-boundary";

type InputMode = "manual" | "camera";

export function AnnualInspectionQrLookupPanel() {
  const cameraAvailable = canUseQrCamera();
  const [inputMode, setInputMode] = useState<InputMode>("manual");
  const [qrCodigo, setQrCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraSession, setCameraSession] = useState(0);
  const scanHandledRef = useRef(false);

  const openFiscalBookRecord = useCallback((printerId: number, inspectionId: number) => {
    const session = getSession();
    if (!session) {
      setError("No hay sesión activa.");
      return;
    }

    completeFiscalBooksHandoffFromAdmin({
      token: session.token,
      remember: isRemembered(),
      adminPath: `/fiscal-book/${printerId}?tab=inspection&registro=${inspectionId}`,
    });
  }, []);

  const runLookup = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) {
        setError(QR_INVALID_CODE_MESSAGE);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await lookupInspectionByQr(trimmed);
        openFiscalBookRecord(result.printerId, result.inspectionId);
      } catch (err) {
        setError(getQrLookupErrorMessage(err));
        setLoading(false);
      }
    },
    [openFiscalBookRecord],
  );

  const handleScan = useCallback(
    (decodedText: string) => {
      if (loading || scanHandledRef.current) return;
      scanHandledRef.current = true;
      setQrCodigo(decodedText);
      void runLookup(decodedText);
    },
    [loading, runLookup],
  );

  const handleCameraError = useCallback((message: string) => {
    setCameraError(message);
  }, []);

  return (
    <section className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
        <QrCode className="size-5 text-accent" />
        Verificar comprobante QR
      </h2>
      <p className="mt-1 text-sm text-muted">
        Escanee o pegue el código impreso tras una inspección anual para abrir el registro
        correspondiente en el libro fiscal.
      </p>

      {cameraAvailable ? (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => {
              scanHandledRef.current = false;
              setInputMode("camera");
              setCameraError(null);
              setError(null);
              setCameraSession((session) => session + 1);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              inputMode === "camera"
                ? "bg-accent text-accent-foreground"
                : "bg-foreground/5 text-muted"
            }`}
          >
            Escanear
          </button>
          <button
            type="button"
            onClick={() => setInputMode("manual")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              inputMode === "manual"
                ? "bg-accent text-accent-foreground"
                : "bg-foreground/5 text-muted"
            }`}
          >
            Pegar código
          </button>
        </div>
      ) : null}

      <div className="mt-4">
        {inputMode === "camera" && cameraAvailable ? (
          <>
            <QrScannerErrorBoundary onError={handleCameraError}>
              <QrCodeScanner
                key={cameraSession}
                onScan={handleScan}
                onError={handleCameraError}
              />
            </QrScannerErrorBoundary>
            {cameraError ? (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-amber-700 dark:text-amber-300">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => {
                    scanHandledRef.current = false;
                    setCameraError(null);
                    setCameraSession((session) => session + 1);
                  }}
                  className="text-sm font-semibold text-accent hover:opacity-80"
                >
                  Reintentar cámara
                </button>
              </div>
            ) : null}
            {loading ? (
              <p className="mt-2 text-center text-sm font-medium text-muted">
                Buscando registro y abriendo libro fiscal…
              </p>
            ) : null}
          </>
        ) : (
          <div className="space-y-3">
            <textarea
              rows={3}
              value={qrCodigo}
              onChange={(e) => {
                setQrCodigo(e.target.value);
                setError(null);
              }}
              placeholder="Pegue aquí el contenido del QR…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs"
            />
            <button
              type="button"
              disabled={loading || !qrCodigo.trim()}
              onClick={() => void runLookup(qrCodigo)}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              {loading ? "Buscando…" : "Verificar y abrir registro"}
            </button>
          </div>
        )}
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-950 dark:text-rose-100"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
