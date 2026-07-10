import { type NextRequest, NextResponse } from "next/server";
import { getSessionCookieName } from "@/lib/session-cookie";
import { requireRole } from "@/lib/server-request-auth";
import {
  buildToolsPdfFilename,
  getToolsPdfTypeLabel,
  type ToolsPdfDownloadRequest,
} from "@/modules/tools/pdf/tools-pdf-shared";
import { createToolsPdfBuffer } from "@/modules/tools/pdf/tools-pdf-server";

async function requireSession(request: NextRequest): Promise<NextResponse | null> {
  const session = request.cookies.get(getSessionCookieName())?.value;
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  }
  const auth = requireRole(request, "tools", "read");
  if (auth instanceof Response) {
    const body = (await auth.json()) as { error?: string };
    return NextResponse.json(body, { status: auth.status });
  }
  return null;
}

export async function POST(request: NextRequest) {
  const authError = await requireSession(request);
  if (authError) {
    return authError;
  }

  let body: ToolsPdfDownloadRequest;
  try {
    body = (await request.json()) as ToolsPdfDownloadRequest;
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }

  const rawContent = body.rawContent || body.content;
  if (!rawContent) {
    return NextResponse.json({ error: "rawContent requerido" }, { status: 400 });
  }

  try {
    const label = body.documentType
      ? getToolsPdfTypeLabel(body.documentType)
      : body.title || "Documento";
    const serial = body.printerSerial || body.serial;
    const filename = buildToolsPdfFilename(label, serial, body.documentNumber);
    const buffer = await createToolsPdfBuffer({
      rawContent,
      documentType: body.documentType,
      documentNumber: body.documentNumber,
      printerSerial: serial,
      title: body.title,
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo generar el PDF.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
