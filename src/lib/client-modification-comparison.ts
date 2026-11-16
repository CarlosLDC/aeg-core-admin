import type { ClientModificationRequestDetailResponse } from "@/types/client-modification-request";
import type { ContributorType } from "@/types/company";

export type ClientComparisonFieldKey =
  | "businessName"
  | "rif"
  | "contributorType"
  | "state"
  | "city"
  | "address"
  | "contactPersonName"
  | "phone"
  | "email";

export type ClientComparisonRow = {
  key: ClientComparisonFieldKey;
  label: string;
  before: string;
  after: string;
  changed: boolean;
  mono?: boolean;
  fullWidth?: boolean;
  beforeContributor: ContributorType | null;
  afterContributor: ContributorType | null;
};

export type InlineTextDiff =
  | {
      partial: true;
      prefix: string;
      beforeChanged: string;
      afterChanged: string;
      suffix: string;
    }
  | {
      partial: false;
      before: string;
      after: string;
    };

export function formatComparisonValue(
  value: string | number | undefined | null,
): string {
  if (value == null) return "—";
  const text = String(value).trim();
  return text || "—";
}

export function isContributorType(value: unknown): value is ContributorType {
  return value === "ordinario" || value === "especial" || value === "formal";
}

export function buildClientComparisonRows(
  row: ClientModificationRequestDetailResponse,
): ClientComparisonRow[] {
  const current = row.currentClientSnapshot;
  const proposed = row.proposedData;
  const isDelete = row.actionType === "DELETE";

  const fieldDefs: Array<{
    key: ClientComparisonFieldKey;
    label: string;
    beforeRaw: string | undefined | null;
    afterRaw: string | undefined | null;
    mono?: boolean;
    fullWidth?: boolean;
    isContributor?: boolean;
  }> = [
    {
      key: "businessName",
      label: "Razón social",
      beforeRaw: current?.businessName,
      afterRaw: proposed?.businessName,
      fullWidth: true,
    },
    {
      key: "rif",
      label: "RIF",
      beforeRaw: current?.rif,
      afterRaw: proposed?.rif,
      mono: true,
    },
    {
      key: "contributorType",
      label: "Tipo de contribuyente",
      beforeRaw: current?.contributorType,
      afterRaw: proposed?.contributorType,
      isContributor: true,
    },
    {
      key: "state",
      label: "Estado",
      beforeRaw: current?.state,
      afterRaw: proposed?.state,
    },
    {
      key: "city",
      label: "Ciudad",
      beforeRaw: current?.city,
      afterRaw: proposed?.city,
    },
    {
      key: "address",
      label: "Dirección",
      beforeRaw: current?.address,
      afterRaw: proposed?.address,
      fullWidth: true,
    },
    {
      key: "contactPersonName",
      label: "Contacto",
      beforeRaw: current?.contactPersonName,
      afterRaw: proposed?.contactPersonName,
    },
    {
      key: "phone",
      label: "Teléfono",
      beforeRaw: current?.phone,
      afterRaw: proposed?.phone,
      mono: true,
    },
    {
      key: "email",
      label: "Correo",
      beforeRaw: current?.email,
      afterRaw: proposed?.email,
    },
  ];

  return fieldDefs.map((field) => {
    const before = formatComparisonValue(field.beforeRaw);
    const after = isDelete ? "Eliminar" : formatComparisonValue(field.afterRaw);
    return {
      key: field.key,
      label: field.label,
      before,
      after,
      changed: isDelete || before !== after,
      mono: field.mono,
      fullWidth: field.fullWidth,
      beforeContributor:
        field.isContributor && isContributorType(field.beforeRaw)
          ? field.beforeRaw
          : null,
      afterContributor:
        field.isContributor && !isDelete && isContributorType(field.afterRaw)
          ? field.afterRaw
          : null,
    };
  });
}

/**
 * Computes a minimal prefix/suffix diff when two strings share enough context,
 * making single-character typo fixes immediately scannable.
 */
export function computeInlineTextDiff(
  before: string,
  after: string,
): InlineTextDiff {
  if (
    before === after ||
    before === "—" ||
    after === "—" ||
    after === "Eliminar"
  ) {
    return { partial: false, before, after };
  }

  const minLen = Math.min(before.length, after.length);
  let prefixLen = 0;
  while (prefixLen < minLen && before[prefixLen] === after[prefixLen]) {
    prefixLen += 1;
  }

  let suffixLen = 0;
  while (
    suffixLen < minLen - prefixLen &&
    before[before.length - 1 - suffixLen] ===
      after[after.length - 1 - suffixLen]
  ) {
    suffixLen += 1;
  }

  const sharedLen = prefixLen + suffixLen;
  const threshold = Math.max(4, Math.floor(minLen * 0.35));
  if (sharedLen < threshold) {
    return { partial: false, before, after };
  }

  return {
    partial: true,
    prefix: before.slice(0, prefixLen),
    beforeChanged: before.slice(prefixLen, before.length - suffixLen),
    afterChanged: after.slice(prefixLen, after.length - suffixLen),
    suffix: suffixLen > 0 ? before.slice(before.length - suffixLen) : "",
  };
}
