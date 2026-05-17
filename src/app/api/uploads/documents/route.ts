import { get, put } from "@vercel/blob";
import { type NextRequest, NextResponse } from "next/server";
import { isBlobUploadFolder } from "@/lib/blob-upload-categories";
import {
  BLOB_DOCUMENT_MAX_BYTES,
  blobUploadErrorMessage,
  resolveBlobContentType,
} from "@/lib/blob-upload-server";
import { blobAccessForUrl, isVercelBlobUrl } from "@/lib/blob-storage";
import { getSessionCookieName } from "@/lib/session-cookie";

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
      console.error("[blob-documents view]", error);
    }
    return NextResponse.json(
      { error: blobUploadErrorMessage(error) },
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

  const contentType = resolveBlobContentType(file);
  if (!contentType) {
    return NextResponse.json(
      { error: "Solo se permiten PDF o imágenes (JPG, PNG, WebP, GIF)." },
      { status: 400 },
    );
  }

  const safeName = file.name.replace(/[^\w.\-()+ ]/g, "_").slice(0, 120);
  const pathname = `${folder}/${Date.now()}-${safeName}`;

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
      console.error("[blob-documents upload]", error);
    }
    return NextResponse.json(
      { error: blobUploadErrorMessage(error) },
      { status: 500 },
    );
  }
}
