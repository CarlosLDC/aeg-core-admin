import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { CONTRIBUTOR_TYPES, type ContributorType } from "@/types/company";

export const SENIAT_EXTRACT_MAX_BYTES = 8 * 1024 * 1024;

export const SENIAT_ACCEPT_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const RIF_PATTERN = /^[VEJPG][0-9]{7,9}$/;

/** Modelos compatibles con Google AI Studio (mayo 2026). */
export const GEMINI_MODEL_DEFAULT = "gemini-2.5-flash";
export const GEMINI_MODEL_FALLBACKS = [
  "gemini-2.5-flash",
  "gemini-3-flash-preview",
] as const;

const contributorTypeSchema = z.enum(CONTRIBUTOR_TYPES);

const rawExtractSchema = z.object({
  rif: z.string(),
  businessName: z.string(),
  contributorType: contributorTypeSchema.nullable(),
  state: z.string(),
  city: z.string(),
  address: z.string(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  fieldConfidence: z.record(z.string(), z.number()).optional(),
});

export type SeniatExtractResult = z.infer<typeof rawExtractSchema>;

const SENIAT_PROMPT = `Eres un asistente que extrae datos fiscales de documentos venezolanos (SENIAT, RIF, registro de contribuyente o comprobante fiscal).

Analiza la imagen o PDF y devuelve ÚNICAMENTE un objeto JSON válido (sin markdown, sin comentarios) con estas claves:
- rif: string (letra V, E, J, P o G + dígitos, sin guiones)
- businessName: string (razón social)
- contributorType: "ordinario" | "especial" | "formal" | null (null si no aparece claro)
- state: string (estado de Venezuela)
- city: string (ciudad o municipio)
- address: string (dirección fiscal de la sucursal o establecimiento)
- phone: string | null (opcional)
- email: string | null (opcional)
- fieldConfidence: objeto opcional con claves de campo y número 0-1 indicando confianza

Reglas:
- No inventes datos que no estén en el documento; usa "" para strings vacíos si no hay valor.
- Normaliza el RIF sin guiones ni espacios.
- Si el documento no es legible o no es fiscal venezolano, devuelve strings vacíos y contributorType null.`;

export function normalizeRif(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/^([VEJPG])(\d)/, "$1$2");
}

export function mapContributorType(raw: string | null | undefined): ContributorType | null {
  if (!raw?.trim()) return null;
  const key = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (key.includes("especial")) return "especial";
  if (key.includes("formal")) return "formal";
  if (key.includes("ordinario")) return "ordinario";
  if (contributorTypeSchema.safeParse(key).success) {
    return key as ContributorType;
  }
  return null;
}

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(trimmed);
  return fence ? fence[1].trim() : trimmed;
}

export function parseSeniatExtractJson(text: string): SeniatExtractResult {
  const parsed: unknown = JSON.parse(stripJsonFence(text));
  const data = rawExtractSchema.parse(parsed);

  const rif = normalizeRif(data.rif);
  if (rif && !RIF_PATTERN.test(rif)) {
    throw new Error("El RIF extraído no tiene un formato válido.");
  }

  return {
    ...data,
    rif,
    businessName: data.businessName.trim(),
    contributorType: mapContributorType(data.contributorType),
    state: data.state.trim(),
    city: data.city.trim(),
    address: data.address.trim(),
    phone: data.phone?.trim() || null,
    email: data.email?.trim() || null,
  };
}

export function resolveGeminiModel(): string {
  const configured = process.env.GEMINI_MODEL?.trim();
  if (configured) return configured;
  return GEMINI_MODEL_DEFAULT;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_NOT_CONFIGURED");
  }
  return new GoogleGenAI({ apiKey });
}

function isModelNotFoundError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error ?? "");
  return message.includes("404") || message.includes("not found");
}

function isQuotaError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error ?? "");
  return message.includes("429") || message.includes("quota");
}

export function formatGeminiError(error: unknown): string {
  if (error instanceof Error && error.message === "GEMINI_NOT_CONFIGURED") {
    return "IA no configurada. Añade GEMINI_API_KEY en el servidor.";
  }
  if (isQuotaError(error)) {
    return "Cuota de Gemini agotada. Revisa tu plan en Google AI Studio o prueba más tarde.";
  }
  if (isModelNotFoundError(error)) {
    return `Modelo no disponible. Prueba GEMINI_MODEL=gemini-2.5-flash o gemini-3-flash-preview en .env.local.`;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "No se pudo analizar el documento con Gemini.";
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
          { text: SENIAT_PROMPT },
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

export async function extractSeniatFromFile(file: File): Promise<SeniatExtractResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const mimeType = file.type || "application/octet-stream";
  const ai = getGeminiClient();

  const primary = resolveGeminiModel();
  const modelsToTry = [
    primary,
    ...GEMINI_MODEL_FALLBACKS.filter((m) => m !== primary),
  ];

  let lastError: unknown;
  for (const model of modelsToTry) {
    try {
      const text = await generateExtraction(ai, model, mimeType, base64);
      return parseSeniatExtractJson(text);
    } catch (error) {
      lastError = error;
      if (!isModelNotFoundError(error)) break;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(formatGeminiError(lastError));
}

export function findCompanyByRif<T extends { id: number; rif: string }>(
  companies: T[],
  rif: string,
): T | undefined {
  const normalized = normalizeRif(rif);
  if (!normalized) return undefined;
  return companies.find((c) => normalizeRif(c.rif) === normalized);
}
