"use client";

import { useEffect, useState } from "react";
import { QrCode } from "lucide-react";
import {
  decodeAnnualInspectionQr,
  getMqttErrorMessage,
  verifyAnnualInspectionQr,
} from "@/lib/mqtt-api";
import type { AnnualInspectionVerifyQrResponse } from "@/types/mqtt";
import { cn } from "@/lib/utils";

/** Vector del script/firmware usado en tests del backend. */
const FIRMWARE_EXAMPLE_QR =
  "ZSn8njvkbk7x+iu8IOFJD+OXWW65uuvLX79us586JYrENbi5Z8LiNvllg9bhB/ca";

type AnnualInspectionQrDecodeTesterProps = {
  printerId?: number | null;
  registroImpresora?: string | null;
  className?: string;
};

export function AnnualInspectionQrDecodeTester({
  printerId,
  registroImpresora,
  className,
}: AnnualInspectionQrDecodeTesterProps) {
  const [qrCodigo, setQrCodigo] = useState("");
  const [registro, setRegistro] = useState(registroImpresora ?? "");
  const [decoding, setDecoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnnualInspectionVerifyQrResponse | null>(null);
  const [validatedAgainstPrinter, setValidatedAgainstPrinter] = useState(false);

  useEffect(() => {
    if (registroImpresora?.trim()) {
      setRegistro(registroImpresora.trim());
    }
  }, [registroImpresora]);

  async function handleDecode(validate: boolean) {
    const trimmed = qrCodigo.trim();
    if (!trimmed) {
      setError("Pegue el código Base64 del QR.");
      return;
    }

    if (validate) {
      if (printerId == null) {
        setError("Seleccione una impresora para validar registro y MAC.");
        return;
      }
      const registroTrimmed = registro.trim();
      if (!registroTrimmed) {
        setError("Indique el registro de impresora esperado.");
        return;
      }
    }

    setDecoding(true);
    setError(null);
    setResult(null);
    setValidatedAgainstPrinter(false);

    try {
      const response = validate
        ? await verifyAnnualInspectionQr({
            printerId: printerId!,
            qrCodigo: trimmed,
            registroImpresora: registro.trim(),
          })
        : await decodeAnnualInspectionQr({ qrCodigo: trimmed });
      setResult(response);
      setValidatedAgainstPrinter(validate);
    } catch (err) {
      setError(getMqttErrorMessage(err));
    } finally {
      setDecoding(false);
    }
  }

  return (
    <section
      className={cn(
        "rounded-xl border border-dashed border-border bg-card/50 p-5 shadow-sm",
        className,
      )}
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
        <QrCode className="size-4 text-accent" />
        Probar desencriptador QR
      </h3>
      <p className="mt-1 text-xs text-muted">
        Desencripta el payload AES del QR impreso tras SetDateRevO. La clave vive solo en el
        servidor; use esto para diagnosticar códigos sin guardar una inspección.
      </p>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-card-foreground">
            Código QR (Base64)
          </span>
          <textarea
            rows={3}
            value={qrCodigo}
            onChange={(e) => {
              setQrCodigo(e.target.value);
              setResult(null);
              setError(null);
            }}
            placeholder="Pegue el contenido del QR…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setQrCodigo(FIRMWARE_EXAMPLE_QR)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-foreground/5"
          >
            Cargar ejemplo firmware
          </button>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-card-foreground">
            Registro impresora (solo para validar contra equipo)
          </span>
          <input
            type="text"
            value={registro}
            onChange={(e) => setRegistro(e.target.value)}
            placeholder={registroImpresora ?? "GRA0000017"}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={decoding || !qrCodigo.trim()}
            onClick={() => void handleDecode(false)}
            className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground disabled:opacity-50"
          >
            {decoding ? "Procesando…" : "Desencriptar"}
          </button>
          <button
            type="button"
            disabled={decoding || !qrCodigo.trim() || printerId == null}
            onClick={() => void handleDecode(true)}
            className="rounded-lg border border-border px-4 py-2 text-xs font-medium hover:bg-foreground/5 disabled:opacity-50"
            title={
              printerId == null
                ? "Seleccione una impresora arriba para validar registro y MAC"
                : undefined
            }
          >
            Desencriptar y validar equipo
          </button>
        </div>

        {result ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
            <p className="font-medium text-emerald-900 dark:text-emerald-100">
              {validatedAgainstPrinter
                ? "QR válido para la impresora seleccionada"
                : "Desencriptación correcta"}
            </p>
            <dl className="mt-2 grid gap-2 sm:grid-cols-3">
              <div>
                <dt className="text-muted">Registro</dt>
                <dd className="font-mono font-semibold">{result.registro}</dd>
              </div>
              <div>
                <dt className="text-muted">MAC</dt>
                <dd className="font-mono font-semibold">{result.mac}</dd>
              </div>
              <div>
                <dt className="text-muted">Fecha</dt>
                <dd className="font-mono font-semibold">{result.fecha}</dd>
              </div>
            </dl>
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-950 dark:text-rose-100"
          >
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
