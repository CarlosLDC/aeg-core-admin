"use client";

import { useRef, useState } from "react";
import { FileText, ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import type { BlobUploadFolder } from "@/lib/blob-upload-categories";
import {
  blobDocumentLabel,
  BLOB_DOCUMENT_ACCEPT,
  documentViewUrl,
  isPdfUrl,
  uploadBlobDocument,
} from "@/lib/blob-documents";
import { cn } from "@/lib/utils";

type PhotoDocumentUploadProps = {
  folder: BlobUploadFolder;
  urls: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
  ariaLabel?: string;
  addLabel?: string;
  requiredHint?: string;
};

export function PhotoDocumentUpload({
  folder,
  urls,
  onChange,
  disabled = false,
  ariaLabel = "Subir fotos o documentos",
  addLabel = "Añadir archivos",
  requiredHint = "Se requiere al menos un archivo.",
}: PhotoDocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length || disabled) return;
    setUploadError(null);
    setUploading(true);

    const nextUrls = [...urls];
    try {
      for (const file of Array.from(fileList)) {
        const url = await uploadBlobDocument(file, folder);
        nextUrls.push(url);
      }
      onChange(nextUrls);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "No se pudo subir el archivo.",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeUrl(index: number) {
    onChange(urls.filter((_, i) => i !== index));
  }

  function openFilePicker() {
    if (disabled || uploading) return;
    inputRef.current?.click();
  }

  const hasFiles = urls.length > 0;

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={BLOB_DOCUMENT_ACCEPT}
        multiple
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => void handleFiles(e.target.files)}
      />

      <div
        role="group"
        aria-label={ariaLabel}
        className={cn(
          "rounded-xl border border-dashed border-border bg-foreground/[0.02] px-4 py-5",
          disabled && "opacity-60",
        )}
      >
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={openFilePicker}
          className="group flex w-full flex-col items-center gap-3 rounded-lg px-1 py-0.5 text-center transition-colors enabled:hover:bg-foreground/[0.02] disabled:cursor-not-allowed"
        >
          <div className="flex size-11 items-center justify-center rounded-full bg-accent/10 text-accent">
            {uploading ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : (
              <Upload className="size-5" aria-hidden />
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-card-foreground">
              {uploading ? "Subiendo archivos…" : addLabel}
            </p>
            <p className="text-xs leading-relaxed text-muted">
              PDF o imágenes (JPG, PNG, WebP, GIF)
              <span className="mx-1 text-border">·</span>
              máx. 10 MB
            </p>
            {!hasFiles && !uploading && requiredHint && (
              <p className="pt-0.5 text-xs text-muted/90">{requiredHint}</p>
            )}
          </div>
          <span
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground",
              !disabled && !uploading && "group-hover:border-accent/30",
            )}
          >
            {uploading ? "Espera un momento…" : "Elegir archivos"}
          </span>
        </button>
      </div>

      {uploadError && (
        <p
          role="alert"
          className="rounded-lg border border-amber-200/70 bg-amber-500/8 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/25 dark:text-amber-100"
        >
          {uploadError}
        </p>
      )}

      {hasFiles && (
        <ul className="space-y-2">
          {urls.map((url, index) => {
            const pdf = isPdfUrl(url);
            const viewUrl = documentViewUrl(url);
            const Icon = pdf ? FileText : ImageIcon;
            return (
              <li
                key={`${url}-${index}`}
                className="flex items-start gap-2.5 rounded-lg border border-border bg-background p-2.5"
              >
                <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-foreground/5">
                  {!pdf ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={viewUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <Icon className="size-4 text-muted" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="truncate text-sm font-medium text-card-foreground">
                    {blobDocumentLabel(url)}
                  </p>
                  <a
                    href={viewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-block text-xs text-accent hover:underline"
                  >
                    Ver archivo
                  </a>
                </div>
                <button
                  type="button"
                  disabled={disabled || uploading}
                  onClick={() => removeUrl(index)}
                  className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50"
                  aria-label="Quitar archivo"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
