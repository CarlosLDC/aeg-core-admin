import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import {
  formatGeminiError,
  GEMINI_MODEL_FALLBACKS,
  geminiErrorText,
  isGeminiOverloadError,
  resolveGeminiModel,
} from "@/lib/seniat-extract";
import {
  COMMERCIAL_PAYMENT_METHODS,
  type CommercialPaymentMethod,
} from "@/types/commercial-payment";

const rawPaymentSchema = z.object({
  metodoBanco: z.string().nullable().optional(),
  monto: z.union([z.number(), z.string()]).nullable().optional(),
  referencia: z.string().nullable().optional(),
  cuentaDestino: z.string().nullable().optional(),
  fechaPago: z.string().nullable().optional(),
});

export type PaymentExtractResult = {
  metodoBanco: CommercialPaymentMethod | null;
  monto: number | null;
  referencia: string | null;
  cuentaDestino: string | null;
  fechaPago: string | null;
};

const PAYMENT_PROMPT = `Eres un asistente que extrae datos de comprobantes de pago (transferencia, Zelle, Binance, efectivo o depósito).

Analiza la imagen o PDF y devuelve ÚNICAMENTE un objeto JSON válido (sin markdown) con estas claves:
- metodoBanco: uno de "BNC", "BINANCE", "ZELLE", "DOLARES_EFECTIVO", "BCV", "OTRO", o null si no se identifica
- monto: número (sin símbolos) o null
- referencia: string o null (número de referencia, confirmación o hash corto)
- cuentaDestino: string o null (cuenta, correo Zelle o wallet de destino)
- fechaPago: string YYYY-MM-DD o null

Reglas:
- No inventes datos que no estén en el documento.
- BNC o Banco Nacional de Crédito → BNC. Binance → BINANCE. Zelle → ZELLE. Efectivo en dólares → DOLARES_EFECTIVO. Banco Central o tasa BCV → BCV. Cualquier otro banco → OTRO.`;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_NOT_CONFIGURED");
  }
  return new GoogleGenAI({ apiKey });
}

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(trimmed);
  return fence ? fence[1].trim() : trimmed;
}

function mapMethod(raw: string | null | undefined): CommercialPaymentMethod | null {
  if (!raw?.trim()) return null;
  const key = raw
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Z0-9_ ]/g, " ");
  if (COMMERCIAL_PAYMENT_METHODS.includes(key as CommercialPaymentMethod)) {
    return key as CommercialPaymentMethod;
  }
  if (key.includes("BINANCE")) return "BINANCE";
  if (key.includes("ZELLE")) return "ZELLE";
  if (key.includes("EFECTIVO") || key.includes("CASH")) return "DOLARES_EFECTIVO";
  if (key.includes("BCV") || key.includes("CENTRAL")) return "BCV";
  if (key.includes("BNC") || key.includes("NACIONAL DE CREDITO")) return "BNC";
  if (key.includes("OTRO") || key.includes("BANCO") || key.includes("TRANSFER")) return "OTRO";
  return null;
}

function mapAmount(raw: number | string | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const parsed = typeof raw === "number" ? raw : Number(String(raw).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
}

function mapDate(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(trimmed);
  if (!dmy) return null;
  const day = dmy[1].padStart(2, "0");
  const month = dmy[2].padStart(2, "0");
  return `${dmy[3]}-${month}-${day}`;
}

function trimToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed.slice(0, 100) : null;
}

export function parsePaymentExtractJson(text: string): PaymentExtractResult {
  const parsed: unknown = JSON.parse(stripJsonFence(text));
  const data = rawPaymentSchema.parse(parsed);
  return {
    metodoBanco: mapMethod(data.metodoBanco),
    monto: mapAmount(data.monto),
    referencia: trimToNull(data.referencia),
    cuentaDestino: trimToNull(data.cuentaDestino),
    fechaPago: mapDate(data.fechaPago),
  };
}

function isModelNotFoundError(error: unknown): boolean {
  const message = geminiErrorText(error).toLowerCase();
  return message.includes("404") || message.includes("not found");
}

function isQuotaError(error: unknown): boolean {
  const message = geminiErrorText(error).toLowerCase();
  return (
    message.includes("429") ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("resource_exhausted")
  );
}

async function generateExtraction(
  ai: GoogleGenAI,
  model: string,
  mimeType: string,
  base64: string,
): Promise<string> {
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          { text: PAYMENT_PROMPT },
          { inlineData: { mimeType, data: base64 } },
        ],
      },
    ],
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  });
  const text = response.text;
  if (!text?.trim()) {
    throw new Error("El modelo no devolvió datos. Prueba con otra imagen más legible.");
  }
  return text;
}

export async function extractPaymentFromFile(file: File): Promise<PaymentExtractResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const mimeType = file.type || "application/octet-stream";
  const ai = getGeminiClient();
  const primary = resolveGeminiModel();
  const modelsToTry = [
    primary,
    ...GEMINI_MODEL_FALLBACKS.filter((model) => model !== primary),
  ];

  let lastError: unknown;
  for (const model of modelsToTry) {
    try {
      const text = await generateExtraction(ai, model, mimeType, base64);
      return parsePaymentExtractJson(text);
    } catch (error) {
      lastError = error;
      const retryable = isModelNotFoundError(error) || isGeminiOverloadError(error);
      if (!retryable) break;
    }
  }

  const err = new Error(formatGeminiError(lastError)) as Error & { code?: string };
  if (lastError instanceof Error && lastError.message === "GEMINI_NOT_CONFIGURED") {
    err.code = "GEMINI_NOT_CONFIGURED";
  } else if (isGeminiOverloadError(lastError)) {
    err.code = "GEMINI_OVERLOAD";
  } else if (isQuotaError(lastError)) {
    err.code = "GEMINI_QUOTA";
  }
  throw err;
}
