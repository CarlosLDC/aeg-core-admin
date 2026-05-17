import { put } from "@vercel/blob";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  CONTRACT_DOCUMENT_MAX_BYTES,
  isContractDocumentMime,
} from "@/lib/contract-documents";
import { getSessionCookieName } from "@/lib/session-cookie";
import type { ContractKind } from "@/types/contract";

export const runtime = "nodejs";

function sanitizeFilename(name: string): string {
  const base = name.replace(/[/\\?%*:|"<>]/g, "_").trim() || "documento";
  return base.slice(0, 120);
}

function isContractKind(value: string | null): value is ContractKind {
  return value === "distributor" || value === "serviceCenter";
}

export async function POST(request: Request) {
  const session = (await cookies()).get(getSessionCookieName());
  if (!session?.value) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        message:
          "Almacenamiento no configurado. Añade BLOB_READ_WRITE_TOKEN en Vercel.",
      },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: "Petición inválida." }, { status: 400 });
  }

  const file = formData.get("file");
  const kindRaw = formData.get("kind");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { message: "Falta el archivo a subir." },
      { status: 400 },
    );
  }

  if (!isContractKind(typeof kindRaw === "string" ? kindRaw : null)) {
    return NextResponse.json(
      { message: "Tipo de contrato no válido." },
      { status: 400 },
    );
  }

  if (!isContractDocumentMime(file.type)) {
    return NextResponse.json(
      { message: "Solo se permiten PDF o imágenes (JPG, PNG, WebP, GIF)." },
      { status: 400 },
    );
  }

  if (file.size > CONTRACT_DOCUMENT_MAX_BYTES) {
    return NextResponse.json(
      { message: "El archivo supera el límite de 10 MB." },
      { status: 400 },
    );
  }

  const pathname = `contracts/${kindRaw}/${Date.now()}-${sanitizeFilename(file.name)}`;

  try {
    const blob = await put(pathname, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: file.type,
    });

    return NextResponse.json({ url: blob.url });
  } catch {
    return NextResponse.json(
      { message: "Error al guardar el archivo en el almacenamiento." },
      { status: 500 },
    );
  }
}
