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
  /** Fila horizontal y lista acotada; pensado para modales con altura fija. */
  compact?: boolean;
};

export function PhotoDocumentUpload({
  folder,
  urls,
  onChange,
  disabled = false,
  ariaLabel = "Subir fotos o documentos",
  addLabel = "Añadir archivos",
  requiredHint = "Se requiere al menos un archivo.",
  compact = false,
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

  const fileRows = urls.map((url, index) => {
    const pdf = isPdfUrl(url);
    const viewUrl = documentViewUrl(url);
    const Icon = pdf ? FileText : ImageIcon;
    return (
      <li
        key={`${url}-${index}`}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-border bg-background",
          compact ? "p-1.5" : "items-start gap-2.5 p-2.5",
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-foreground/5",
            compact ? "size-8" : "size-10",
          )}
        >
          {!pdf ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={viewUrl} alt="" className="size-full object-cover" />
          ) : (
            <Icon
              className={cn("text-muted", compact ? "size-3.5" : "size-4")}
              aria-hidden
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate font-medium text-card-foreground",
              compact ? "text-xs" : "text-sm",
            )}
          >
            {blobDocumentLabel(url)}
          </p>
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent hover:underline"
          >
            Ver archivo
          </a>
        </div>
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => removeUrl(index)}
          className={cn(
            "shrink-0 rounded-lg text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50",
            compact ? "p-1" : "p-1.5",
          )}
          aria-label="Quitar archivo"
        >
          <Trash2 className={compact ? "size-3.5" : "size-4"} />
        </button>
      </li>
    );
  });

  return (
    <div
      className={cn(
        compact ? "flex min-h-0 flex-1 flex-col gap-2" : "space-y-3",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={BLOB_DOCUMENT_ACCEPT}
        multiple
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {compact ? (
        <div
          role="group"
          aria-label={ariaLabel}
          className={cn(
            "shrink-0 rounded-xl border border-dashed border-border bg-foreground/[0.02] px-4 py-4",
            disabled && "opacity-60",
          )}
        >
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
              {uploading ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                <Upload className="size-5" aria-hidden />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-medium text-card-foreground">
                {uploading ? "Subiendo archivos…" : addLabel}
              </p>
              <p className="text-xs leading-relaxed text-muted">
                PDF o imágenes (JPG, PNG, WebP, GIF)
                <span className="mx-1 text-border">·</span>
                máx. 10 MB
              </p>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={openFilePicker}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50"
              >
                {uploading
                  ? "Espera un momento…"
                  : hasFiles
                    ? "Añadir más"
                    : "Elegir archivos"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          role="group"
          aria-label={ariaLabel}
          className={cn(
            "shrink-0 rounded-xl border border-dashed border-border bg-foreground/[0.02] px-4 py-5",
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
              {!hasFiles && !uploading && requiredHint ? (
                <p className="pt-0.5 text-xs text-muted/90">{requiredHint}</p>
              ) : null}
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
      )}

      {uploadError && (
        <p
          role="alert"
          className={cn(
            "shrink-0 rounded-lg border border-amber-200/70 bg-amber-500/8 text-amber-900 dark:border-amber-500/25 dark:text-amber-100",
            compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm",
          )}
        >
          {uploadError}
        </p>
      )}

      {hasFiles && (
        <ul
          className={cn(
            compact
              ? "min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-0.5"
              : "space-y-2",
          )}
        >
          {fileRows}
        </ul>
      )}
    </div>
  );
}
