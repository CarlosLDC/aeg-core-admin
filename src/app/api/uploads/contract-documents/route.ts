import {
  BlobAccessError,
  BlobClientTokenExpiredError,
  BlobContentTypeNotAllowedError,
  BlobError,
  BlobFileTooLargeError,
  BlobStoreNotFoundError,
  BlobStoreSuspendedError,
  get,
  put,
} from "@vercel/blob";
import { type NextRequest, NextResponse } from "next/server";
import { blobAccessForUrl, isVercelBlobUrl } from "@/lib/blob-storage";
import { getSessionCookieName } from "@/lib/session-cookie";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function blobErrorMessage(error: unknown): string {
  if (error instanceof BlobClientTokenExpiredError) {
    return "El token de almacenamiento expiró. Vuelve a desplegar o actualiza BLOB_READ_WRITE_TOKEN en Vercel.";
  }
  if (error instanceof BlobStoreNotFoundError) {
    return "No hay un Blob Store vinculado al proyecto. Créalo en Vercel → Storage y redeploy.";
  }
  if (error instanceof BlobStoreSuspendedError) {
    return "El almacenamiento está suspendido. Revisa el panel de Vercel Blob.";
  }
  if (error instanceof BlobContentTypeNotAllowedError) {
    return "Tipo de archivo no permitido en el store de Blob.";
  }
  if (error instanceof BlobFileTooLargeError) {
    return "El archivo supera el límite del almacenamiento.";
  }
  if (error instanceof BlobAccessError) {
    return "Sin permiso para escribir en Blob. Comprueba BLOB_READ_WRITE_TOKEN.";
  }
  if (error instanceof BlobError) {
    return error.message;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Error al guardar el archivo en el almacenamiento.";
}

function requireSession(request: NextRequest): NextResponse | null {
  const session = request.cookies.get(getSessionCookieName())?.value;
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const unauthorized = requireSession(request);
  if (unauthorized) return unauthorized;

  const url = request.nextUrl.searchParams.get("url")?.trim();
  if (!url || !isVercelBlobUrl(url)) {
    return NextResponse.json({ error: "URL no válida." }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return NextResponse.json(
      { error: "Almacenamiento no configurado." },
      { status: 503 },
    );
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
        headers: { ETag: result.blob.etag },
      });
    }

    const headers = new Headers();
    if (result.blob.contentType) {
      headers.set("Content-Type", result.blob.contentType);
    }
    if (result.blob.contentDisposition) {
      headers.set("Content-Disposition", result.blob.contentDisposition);
    }
    if (result.blob.cacheControl) {
      headers.set("Cache-Control", result.blob.cacheControl);
    }
    headers.set("ETag", result.blob.etag);

    return new NextResponse(result.stream, { status: 200, headers });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[contract-documents view]", error);
    }
    return NextResponse.json(
      { error: blobErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = requireSession(request);
  if (unauthorized) return unauthorized;

  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return NextResponse.json(
      {
        error:
          "Almacenamiento no configurado. En Vercel: Storage → Blob y redeploy. En local: vercel env pull .env.local",
      },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "No se pudo leer el archivo." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Selecciona un archivo válido." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "El archivo supera el límite de 10 MB." },
      { status: 400 },
    );
  }

  let contentType = file.type || "application/octet-stream";
  if (!ALLOWED_TYPES.has(contentType)) {
    const name = file.name.toLowerCase();
    if (name.endsWith(".pdf")) contentType = "application/pdf";
    else if (name.endsWith(".jpg") || name.endsWith(".jpeg")) contentType = "image/jpeg";
    else if (name.endsWith(".png")) contentType = "image/png";
    else if (name.endsWith(".webp")) contentType = "image/webp";
    else if (name.endsWith(".gif")) contentType = "image/gif";
  }

  if (!ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json(
      { error: "Solo se permiten PDF o imágenes (JPG, PNG, WebP, GIF)." },
      { status: 400 },
    );
  }

  const safeName = file.name.replace(/[^\w.\-()+ ]/g, "_").slice(0, 120);
  const pathname = `contracts/${Date.now()}-${safeName}`;

  try {
    const body = Buffer.from(await file.arrayBuffer());
    const blob = await put(pathname, body, {
      access: "private",
      contentType,
      addRandomSuffix: true,
    });
    return NextResponse.json({ url: blob.url, pathname: blob.pathname });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[contract-documents upload]", error);
    }
    return NextResponse.json(
      { error: blobErrorMessage(error) },
      { status: 500 },
    );
  }
}
