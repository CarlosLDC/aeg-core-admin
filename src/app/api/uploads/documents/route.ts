import { get, put } from "@vercel/blob";
import { type NextRequest, NextResponse } from "next/server";
import { isBlobUploadFolder } from "@/lib/blob-upload-categories";
import {
  BLOB_ALLOWED_CONTENT_TYPES,
  BLOB_DOCUMENT_MAX_BYTES,
  blobUploadErrorMessage,
  detectAllowedFileMime,
  extractVercelBlobStoreId,
  resolveBlobContentType,
} from "@/lib/blob-upload-server";
import { blobAccessForUrl, isVercelBlobUrlForStore } from "@/lib/blob-storage";
import { getSessionCookieName } from "@/lib/session-cookie";
import { requireRole } from "@/lib/server-request-auth";

async function requireSession(
  request: NextRequest,
  action: "read" | "create",
): Promise<NextResponse | null> {
  const session = request.cookies.get(getSessionCookieName())?.value;
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  }
  const auth = await requireRole(request, "uploads", action);
  if (auth instanceof Response) {
    const body = (await auth.json().catch(() => null)) as { error?: string } | null;
    return NextResponse.json(
      { error: body?.error ?? "Sin permiso." },
      { status: auth.status },
    );
  }
  return null;
}

export async function GET(request: NextRequest) {
  const unauthorized = await requireSession(request, "read");
  if (unauthorized) return unauthorized;

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    return NextResponse.json(
      { error: "Almacenamiento no configurado." },
      { status: 503 },
    );
  }

  const url = request.nextUrl.searchParams.get("url")?.trim();
  const storeId = extractVercelBlobStoreId(token);
  if (!url || !isVercelBlobUrlForStore(url, storeId)) {
    return NextResponse.json({ error: "URL no válida." }, { status: 400 });
  }

  const access = blobAccessForUrl(url);
  const ifNoneMatch = request.headers.get("if-none-match") ?? undefined;

  try {
    const result = await get(url, { access, ifNoneMatch });
    if (!result) {
      return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 });
    }

    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          "Cache-Control": "private, no-store",
        },
      });
    }

    const rawContentType = result.blob.contentType?.split(";")[0]?.trim().toLowerCase();
    const safeContentType =
      rawContentType && BLOB_ALLOWED_CONTENT_TYPES.has(rawContentType)
        ? rawContentType
        : "application/octet-stream";

    const headers = new Headers();
    headers.set("Content-Type", safeContentType);
    headers.set(
      "Content-Disposition",
      safeContentType === "application/octet-stream" ? "attachment" : "inline",
    );
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
    headers.set("Referrer-Policy", "no-referrer");
    headers.set("Cache-Control", "private, no-store");
    headers.set("ETag", result.blob.etag);

    return new NextResponse(result.stream, { status: 200, headers });
  } catch (error) {
    console.error("[blob-documents view]", error);
    return NextResponse.json(
      { error: blobUploadErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireSession(request, "create");
  if (unauthorized) return unauthorized;

  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return NextResponse.json(
      { error: "El almacenamiento de documentos no está disponible en este momento." },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "No se pudo leer el archivo." }, { status: 400 });
  }

  const folder = String(formData.get("folder") ?? "").trim();
  if (!isBlobUploadFolder(folder)) {
    return NextResponse.json({ error: "Categoría de subida no válida." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Selecciona un archivo válido." }, { status: 400 });
  }

  if (file.size > BLOB_DOCUMENT_MAX_BYTES) {
    return NextResponse.json(
      { error: "El archivo supera el límite de 10 MB." },
      { status: 400 },
    );
  }

  const declaredContentType = resolveBlobContentType(file);
  if (!declaredContentType) {
    return NextResponse.json(
      { error: "Solo se permiten PDF o imágenes (JPG, PNG, WebP, GIF)." },
      { status: 400 },
    );
  }

  const safeName = file.name.replace(/[^\w.\-()+ ]/g, "_").slice(0, 120);
  const pathname = `${folder}/${Date.now()}-${safeName}`;

  try {
    const body = Buffer.from(await file.arrayBuffer());
    const detectedMime = detectAllowedFileMime(body);
    if (!detectedMime) {
      return NextResponse.json(
        { error: "El contenido del archivo no corresponde a un PDF o imagen válida." },
        { status: 400 },
      );
    }

    const blob = await put(pathname, body, {
      access: "private",
      contentType: detectedMime,
      addRandomSuffix: true,
    });
    return NextResponse.json({ url: blob.url, pathname: blob.pathname });
  } catch (error) {
    console.error("[blob-documents upload]", error);
    return NextResponse.json(
      { error: blobUploadErrorMessage(error) },
      { status: 500 },
    );
  }
}
