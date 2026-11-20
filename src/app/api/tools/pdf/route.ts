import { type NextRequest, NextResponse } from "next/server";
import { getSessionCookieName } from "@/lib/session-cookie";
import { requireRole } from "@/lib/server-request-auth";
import {
  buildToolsPdfFilename,
  getToolsPdfTypeLabel,
  type ToolsPdfDownloadRequest,
} from "@/modules/tools/pdf/tools-pdf-shared";
import { createToolsPdfBuffer } from "@/modules/tools/pdf/tools-pdf-server";

const MAX_RAW_CONTENT_CHARS = 200_000;
const MAX_FIELD_CHARS = 120;

async function requireSession(request: NextRequest): Promise<NextResponse | null> {
  const session = request.cookies.get(getSessionCookieName())?.value;
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  }
  const auth = await requireRole(request, "tools", "read");
  if (auth instanceof Response) {
    const body = (await auth.json().catch(() => null)) as { error?: string } | null;
    return NextResponse.json(
      { error: body?.error ?? "Sin permiso." },
      { status: auth.status },
    );
  }
  return null;
}

function optionalBoundedString(
  value: unknown,
  maxLength: number,
): string | undefined | null {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return null;
  return value.slice(0, maxLength);
}

export async function POST(request: NextRequest) {
  const authError = await requireSession(request);
  if (authError) {
    return authError;
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }

  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }

  const body = rawBody as Record<string, unknown>;
  const candidateContent = body.rawContent ?? body.content;
  if (typeof candidateContent !== "string" || candidateContent.trim().length === 0) {
    return NextResponse.json({ error: "rawContent requerido" }, { status: 400 });
  }
  if (candidateContent.length > MAX_RAW_CONTENT_CHARS) {
    return NextResponse.json(
      { error: "El contenido supera el tamaño máximo permitido." },
      { status: 413 },
    );
  }

  const title = optionalBoundedString(body.title, MAX_FIELD_CHARS);
  const documentType = optionalBoundedString(body.documentType, MAX_FIELD_CHARS);
  const serial = optionalBoundedString(
    body.printerSerial ?? body.serial,
    MAX_FIELD_CHARS,
  );

  if (title === null || documentType === null || serial === null) {
    return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 });
  }

  let documentNumber: string | number | undefined;
  if (body.documentNumber !== undefined && body.documentNumber !== null) {
    if (
      typeof body.documentNumber !== "string" &&
      (typeof body.documentNumber !== "number" ||
        !Number.isFinite(body.documentNumber))
    ) {
      return NextResponse.json({ error: "documentNumber inválido." }, { status: 400 });
    }
    documentNumber =
      typeof body.documentNumber === "string"
        ? body.documentNumber.slice(0, MAX_FIELD_CHARS)
        : body.documentNumber;
  }

  const pdfRequest: ToolsPdfDownloadRequest = {
    rawContent: candidateContent,
    documentType,
    documentNumber,
    printerSerial: serial,
    title,
  };

  try {
    const label = documentType
      ? getToolsPdfTypeLabel(documentType)
      : title || "Documento";
    const filename = buildToolsPdfFilename(label, serial, documentNumber);
    const buffer = await createToolsPdfBuffer(pdfRequest);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[tools/pdf]", error);
    return NextResponse.json(
      { error: "No se pudo generar el PDF." },
      { status: 500 },
    );
  }
}
