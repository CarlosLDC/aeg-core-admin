"use client";

import { PhotoDocumentUpload } from "@/components/ui/photo-document-upload";
import type { ContractKind } from "@/types/contract";

type ContractDocumentUploadProps = {
  kind: ContractKind;
  urls: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
};

export function ContractDocumentUpload({
  urls,
  onChange,
  disabled = false,
}: ContractDocumentUploadProps) {
  return (
    <PhotoDocumentUpload
      folder="contracts"
      urls={urls}
      onChange={onChange}
      disabled={disabled}
      ariaLabel="Subir documentos del contrato"
      addLabel="Añadir documentos"
    />
  );
}
