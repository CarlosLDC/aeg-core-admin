export const META_COLUMN_IDS = ["createdAt", "updatedAt"] as const;

export type MetaColumnId = (typeof META_COLUMN_IDS)[number];

export const META_COLUMN_LABELS: Record<MetaColumnId, string> = {
  createdAt: "Creado el",
  updatedAt: "Editado el",
};

/** Ocultas por defecto en todas las tablas. */
export const META_COLUMN_DEFAULT_VISIBLE: Record<MetaColumnId, boolean> = {
  createdAt: false,
  updatedAt: false,
};

export function storageKeyForTable(tableId: string): string {
  return `aeg-table-columns:${tableId}`;
}
