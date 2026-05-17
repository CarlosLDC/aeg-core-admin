"use client";

import { useRef, useState } from "react";
import { FileText, ImageIcon, Loader2, Plus, Trash2, Upload } from "lucide-react";
import {
  contractDocumentLabel,
  CONTRACT_DOCUMENT_ACCEPT,
  isPdfUrl,
  uploadContractDocument,
} from "@/lib/contract-documents";
import type { ContractKind } from "@/types/contract";
import { cn } from "@/lib/utils";

type ContractDocumentUploadProps = {
  kind: ContractKind;
  urls: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
};

export function ContractDocumentUpload({
  kind,
  urls,
  onChange,
  disabled = false,
}: ContractDocumentUploadProps) {
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
        const url = await uploadContractDocument(file, kind);
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

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "rounded-lg border border-dashed border-border bg-foreground/[0.02] p-4",
          disabled && "opacity-60",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={CONTRACT_DOCUMENT_ACCEPT}
          multiple
          className="sr-only"
          disabled={disabled || uploading}
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Upload className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-card-foreground">
              Subir PDF o imágenes del contrato
            </p>
            <p className="text-xs text-muted">
              Máximo 10 MB por archivo. Se guardan en Vercel Blob.
            </p>
          </div>
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {uploading ? "Subiendo…" : "Elegir archivos"}
          </button>
        </div>
      </div>

      {uploadError && (
        <p
          role="alert"
          className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
        >
          {uploadError}
        </p>
      )}

      {urls.length > 0 ? (
        <ul className="space-y-2">
          {urls.map((url, index) => {
            const pdf = isPdfUrl(url);
            const Icon = pdf ? FileText : ImageIcon;
            return (
              <li
                key={`${url}-${index}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2"
              >
                <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-foreground/5">
                  {!pdf ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <Icon className="size-4 text-muted" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-card-foreground">
                    {contractDocumentLabel(url)}
                  </p>
                  <a
                    href={url}
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
                  className="shrink-0 rounded-lg p-2 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50"
                  aria-label="Quitar archivo"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-muted">
          Añade al menos un documento del contrato (PDF o imagen).
        </p>
      )}
    </div>
  );
}
