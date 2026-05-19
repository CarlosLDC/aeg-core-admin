import { type NextRequest, NextResponse } from "next/server";
import {
  extractSeniatFromFile,
  formatGeminiError,
  SENIAT_ACCEPT_MIME,
  SENIAT_EXTRACT_MAX_BYTES,
} from "@/lib/seniat-extract";
import { getSessionCookieName } from "@/lib/session-cookie";
import { requireRole } from "@/lib/server-request-auth";

function requireSession(request: NextRequest): NextResponse | null {
  const session = request.cookies.get(getSessionCookieName())?.value;
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  }
  const auth = requireRole(request, "seniatExtract", "create");
  if (auth instanceof Response) {
    return NextResponse.json({ error: "Sin permiso." }, { status: auth.status });
  }
  return null;
}

function isAllowedMime(type: string, fileName: string): boolean {
  if ((SENIAT_ACCEPT_MIME as readonly string[]).includes(type)) return true;
  const lower = fileName.toLowerCase();
  return (
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".pdf")
  );
}

function resolveMime(file: File): string {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return file.type || "application/octet-stream";
}

export async function POST(request: NextRequest) {
  const unauthorized = requireSession(request);
  if (unauthorized) return unauthorized;

  if (!process.env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          "IA no configurada. Añade GEMINI_API_KEY en Vercel o en .env.local (Google AI Studio).",
        code: "GEMINI_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "No se pudo leer el archivo." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "Selecciona una imagen o PDF." },
      { status: 400 },
    );
  }

  if (file.size > SENIAT_EXTRACT_MAX_BYTES) {
    return NextResponse.json(
      { error: "El archivo supera el límite de 8 MB." },
      { status: 400 },
    );
  }

  const mime = resolveMime(file);
  if (!isAllowedMime(mime, file.name)) {
    return NextResponse.json(
      { error: "Solo se permiten imágenes (JPG, PNG, WebP) o PDF." },
      { status: 400 },
    );
  }

  const uploadFile =
    file.type === mime
      ? file
      : new File([await file.arrayBuffer()], file.name, { type: mime });

  try {
    const data = await extractSeniatFromFile(uploadFile);
    return NextResponse.json({ data });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[seniat-extract]", error);
    }
    if (error instanceof Error && error.message === "GEMINI_NOT_CONFIGURED") {
      return NextResponse.json(
        {
          error: formatGeminiError(error),
          code: "GEMINI_NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }
    const code =
      error instanceof Error
        ? (error as Error & { code?: string }).code
        : undefined;
    const message = formatGeminiError(error);
    const status =
      code === "GEMINI_QUOTA" || message.includes("Cuota")
        ? 429
        : code === "GEMINI_OVERLOAD"
          ? 503
          : 422;
    return NextResponse.json({ error: message, code }, { status });
  }
}
