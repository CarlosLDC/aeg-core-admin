"use client";

import { useEffect, useState } from "react";
import { fetchBlobDocumentBlob, openBlobDocument } from "@/lib/blob-documents";
import { blobViewUrl, isVercelBlobUrl } from "@/lib/blob-storage";
import { cn } from "@/lib/utils";

type ProtectedDocumentLinkProps = {
  url: string;
  download?: string;
  className?: string;
  title?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  children: React.ReactNode;
};

export function ProtectedDocumentLink({
  url,
  download,
  className,
  title,
  onClick,
  children,
}: ProtectedDocumentLinkProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    onClick?.(e);
    if (loading) return;
    setLoading(true);
    try {
      await openBlobDocument(url, { downloadFilename: download });
    } catch {
      // Silenciar rechazo si el usuario canceló o expiró la sesión
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      title={title}
      onClick={handleClick}
      className={cn(
        "cursor-pointer disabled:cursor-wait disabled:opacity-60",
        className,
      )}
    >
      {children}
    </button>
  );
}

type ProtectedDocumentImageProps = {
  url: string;
  alt: string;
  className?: string;
};

export function ProtectedDocumentImage({
  url,
  alt,
  className,
}: ProtectedDocumentImageProps) {
  const isBlob = isVercelBlobUrl(url);
  const safeDirectUrl = isBlob ? null : blobViewUrl(url);
  const [loaded, setLoaded] = useState<{
    sourceUrl: string;
    objectUrl: string;
  } | null>(null);

  useEffect(() => {
    if (!isBlob) return;
    const controller = new AbortController();
    let createdObjectUrl: string | null = null;
    let active = true;

    fetchBlobDocumentBlob(url, controller.signal)
      .then((blob) => {
        if (!active) return;
        createdObjectUrl = URL.createObjectURL(blob);
        setLoaded({ sourceUrl: url, objectUrl: createdObjectUrl });
      })
      .catch(() => {
        if (!active) return;
        setLoaded((prev) => (prev?.sourceUrl === url ? null : prev));
      });

    return () => {
      active = false;
      controller.abort();
      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [isBlob, url]);

  const src = isBlob
    ? loaded?.sourceUrl === url
      ? loaded.objectUrl
      : null
    : safeDirectUrl && safeDirectUrl !== "#"
      ? safeDirectUrl
      : null;

  if (!src) {
    return null;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} />;
}
